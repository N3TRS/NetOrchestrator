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
        backoffLimit: 0,
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
                image: 'tulio3101/omni-maven:v3',
                imagePullPolicy: 'Always',
                args: [
                  runProjectDto.REPO_URL
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


          if (!pods.items || pods.items.length === 0) {
            console.log("Pod not yet");
            setTimeout(() => streamLogs(), 3500);
            return;
          }

          const pod = pods.items[0];
          const podName = pod.metadata?.name;
          const containerName = pod.spec?.containers?.[0]?.name;

          if (!podName || !containerName) {
            setTimeout(() => streamLogs(), 1500);
            return;
          }

          const phase = pod.status?.phase;

          if (phase === 'Pending') {
            setTimeout(() => streamLogs(), 2000);
            return;
          }

          if (phase === 'Running') {
            try {
              await log.log(
                'default',
                podName,
                containerName,
                {
                  write: (chunk: Buffer) => {
                    observer.next({ data: chunk.toString() } as MessageEvent);
                  },
                } as any,
                { follow: true, timestamps: false }
              );
              observer.complete();
            } catch {
              setTimeout(() => streamLogs(), 1000);
            }
            return;
          }
          try {
            const logsResponse = await coreApi.readNamespacedPodLog({
              name: podName,
              namespace: 'default',
              container: containerName,
              follow: false,
            });
            observer.next({ data: logsResponse } as MessageEvent);
            observer.complete();
          } catch (logError) {
            console.error('Error reading final logs: ', logError?.message);
            observer.next({ data: `[ERROR reading logs] ${logError?.message}` } as MessageEvent);
            observer.complete();
          }
        } catch (error) {
          console.error('Log streaming error message:', error?.message);
          observer.next({ data: `[ERROR] ${error.message}` } as MessageEvent);
          observer.complete();
        }
      };

      streamLogs();

    });
  }

}
