import { Injectable } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";
import { Observable } from 'rxjs';


@Injectable()
export class OrchestratorService {
  private kc: k8s.KubeConfig;
  private batchApi: k8s.BatchV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromFile("/home/tulio/.kube/config");
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
  }

  async runningProject(runProjectDto: CreateRunOrchestratorDto) {

    const jobName = `maven-generator-${Date.now()}`;
    const containerName = 'maven-runner';

    const deployment: k8s.V1Job = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
      },
      spec: {
        ttlSecondsAfterFinished: 120,
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
                name: containerName,
                image: 'tulio3101/omni-maven',
                args: [
                  runProjectDto.URL
                ],
                volumeMounts: [
                  {
                    name: 'output-vol',
                    mountPath: '/output',
                  },
                ],
              },
            ],
            volumes: [
              { name: 'output-vol', emptyDir: {} }
            ]
          },
        },
      },
    };

    try {
      const response = await this.batchApi.createNamespacedJob({
        namespace: 'default',
        body: deployment,
      });

      return {
        message: "Job created",
        jobName: jobName
      }

    } catch (error) {
      throw error;
    }
  }

  getJobLogs(jobName: string): Observable<MessageEvent> {
    return new Observable((observer) => {
      const coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
      const log = new k8s.Log(this.kc);

      const streamLogs = async () => {
        try {
          const pods = await coreApi.listNamespacedPod({
            namespace: 'default',
            labelSelector: `job-name=${jobName}`
          });

          const pod = pods.items[0];
          if (!pod || !pod.metadata?.name) {
            setTimeout(() => streamLogs(), 1500)
            return;
          }

          if (pod.status?.phase === 'Pending') {
            setTimeout(() => streamLogs(), 2000);
            return;
          }

          await log.log(
            'default',
            pod.metadata?.name,
            'runner',
            {
              write: (chunk: Buffer) => {
                observer.next({ data: chunk.toString() } as MessageEvent);
              },
            } as any,
            { follow: true, timestamps: false }
          );

        } catch (error) {
          observer.error(error);
        }
      };

      streamLogs();

    });
  }

}
