import { Injectable } from '@nestjs/common';
import { CreateOrchestratorDto } from './dto/create-orchestrator.dto';
import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process'


// ToDo -> Estructura de proyecto devolver al front

@Injectable()
export class OrchestratorService {

  private kc: k8s.KubeConfig;
  private batchApi: k8s.BatchV1Api;
  private coreApi: k8s.CoreV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromFile('/home/tulio/.config/.kube/config');
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }


  private readProjectAsJson(dirPath: string) {

    const result: Record<string, any> = {};
    const items = fs.readdirSync(dirPath);

    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        result[item] = {
          type: 'directory',
          children: this.readProjectAsJson(fullPath),
        };
      } else {
        result[item] = {
          type: 'file',
          content: fs.readFileSync(fullPath, 'utf8'),
        };
      }
    });

    return result;
  }

  async create(createOrchestratorDto: CreateOrchestratorDto) {

    const jobName = `maven-generator-${Date.now()}`


    const deployment: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
      },
      spec: {
        ttlSecondsAfterFinished: 60,
        template: {
          metadata: {
            labels: {
              job: jobName,
            },
          },
          spec: {
            restartPolicy: 'Never',
            containers: [
              {
                name: createOrchestratorDto.container_id,
                image: 'tulio3101/maven-generator:v2',
                args: [
                  createOrchestratorDto.group,
                  createOrchestratorDto.artifact,
                  createOrchestratorDto.name,
                  createOrchestratorDto.description,
                  createOrchestratorDto.package_name,
                  createOrchestratorDto.java_version,
                  createOrchestratorDto.spring_version
                ],
              },
            ],
          },
        },
      },
    };
    try {
      const response = await this.batchApi.createNamespacedJob({
        namespace: 'default',
        body: deployment,
      });
    } catch (error) {
      throw error;
    }

    await this.waitForJobCompletion(jobName);

    const podName = await this.getPodFromJob(jobName);

    const localProjectPath = this.copyOutputFromPod(podName);

    const projectTree = this.readProjectAsJson(localProjectPath);

    return {
      status: 'success',
      project: projectTree,
    };
  }

  async waitForJobCompletion(jobName: string, maxRetries = 90): Promise<void> {

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const job = await this.batchApi.readNamespacedJob({
        name: jobName,
        namespace: 'default',
      });

      if (job.status?.succeeded === 1) return;
      if (job.status?.failed === 1) throw new Error(`Job ${jobName} failed`);
    }

    throw new Error('Job Timeout');

  }

  async getPodFromJob(jobName: string): Promise<string> {

    const pods = await this.coreApi.listNamespacedPod({
      namespace: 'default',
      labelSelector: `job-name=${jobName}`
    });

    const pod = pods.items[0];

    if (!pod) {
      throw new Error("Pod not found for job");
    }

    return pod.metadata!.name!;

  }

  private copyOutputFromPod(podName: string) {

    const localPath = `/tmp/project-${Date.now()}`;


    execSync(
      `kubectl cp default/${podName}:/output ${localPath}`
    );


    return localPath;
  }

}
