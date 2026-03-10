import { Injectable } from '@nestjs/common';
import { CreateOrchestratorDto } from './dto/create-orchestrator.dto';
import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';



// ToDo -> Estructura de proyecto devolver al front

@Injectable()
export class OrchestratorService {

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

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.BatchV1Api);
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);


    const jobName = 'maven-generator'
    const output = '/output/'

    const deployment: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
      },
      spec: {
        template: {
          metadata: {
            labels: {
              job: createOrchestratorDto.name,
            },
          },
          spec: {
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
                volumeMounts: [
                  {
                    name: 'maven-output',
                    mountPath: '/output',
                  },
                ],
              },
            ],
            restartPolicy: 'Never',
            volumes: [
              {
                name: 'maven-output',
                persistentVolumeClaim: {
                  claimName: 'maven-output-pvc',
                },
              },
            ],
          },
        },
      },
    };
    try {
      const response = await k8sApi.createNamespacedJob({
        namespace: 'default',
        body: deployment,
      });
    } catch (error) {
      throw error;
    }

    await this.waitForJobCompletion(jobName, k8sApi, coreApi);

    const projectTree = this.readProjectAsJson(output);

    return {
      status: 'success',
      project: projectTree,
    };
  }

  async waitForJobCompletion(jobName: string, k8sApi: k8s.BatchV1Api, coreApi: k8s.CoreV1Api, maxRetries = 30): Promise<void> {

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const job = await k8sApi.readNamespacedJob({
        name: jobName,
        namespace: 'default',
      });

      if (job.status?.succeeded === 1) return;
      if (job.status?.failed === 1) throw new Error(`Job ${jobName} failed`);
    }

    throw new Error('Job Timeout');

  }

}
