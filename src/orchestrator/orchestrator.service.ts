import { Injectable } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";
import { Socket } from 'socket.io';

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
        ttlSecondsAfterFinished: 600,
        activeDeadlineSeconds: 750,
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
                image: `tulio3101/omni-maven-${runProjectDto.JAVA_VERSION}:v1`,
                resources: {
                  requests: {
                    memory: "512Mi",
                    cpu: "250m"
                  },
                  limits: {
                    memory: "2.5Gi",
                    cpu: "1500m"
                  }
                },
                imagePullPolicy: 'Always',
                args: [
                  runProjectDto.REPO_URL
                ],
                volumeMounts: [
                  {
                    name: 'output-vol',
                    mountPath: '/output',
                  },
                  {
                    name: 'maven-cache',
                    mountPath: '/root/.m2'
                  }
                ],
              },
            ],
            volumes: [
              { name: 'output-vol', emptyDir: {} },
              {
                name: 'maven-cache',
                hostPath: {
                  path: '/home/tulio/.m2-k3s-cache',
                  type: 'DirectoryOrCreate'
                }
              }
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

  async streamLogsToSocket(client: Socket, jobName: string): Promise<void> {
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
                  client.emit('logs:data', chunk.toString());
                },
              } as any,
              {
                follow: true, timestamps: false
              }
            );
            client.emit('logs:complete');
          } catch (error) {
            console.error('Error streaming live logs: ', error?.message);
            setTimeout(() => streamLogs(), 1000);
          }
          return;
        }
        try {
          const logsReponse = await coreApi.readNamespacedPodLog({
            name: podName,
            namespace: 'default',
            container: containerName,
            follow: false,
          });
          client.emit('logs:data', logsReponse);
          client.emit('logs:complete');
        } catch (logError) {
          console.error('Error reading final logs: ', logError?.message);
          client.emit('logs:error', { message: `Error reading logs: ${logError?.message}` });
        }
      } catch (error) {
        console.error('Log streaming error message:', error?.message);
        client.emit('logs:error', { message: error?.message || 'Unknown error ' });
      }
    };

    streamLogs();

  }

}
