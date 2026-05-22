import { Injectable } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";
import { Socket } from "socket.io";
import { JavaOrchestratorDto } from "./dto/java-orchestrator.dto";
import { ClearJobDto } from "./dto/clear-job-orchestrator.dto";

interface JobPodInfo {
  pod: k8s.V1Pod;
  podName: string;
  containerName: string;
  phase: string | undefined;
}

@Injectable()
export class OrchestratorService {
  private kc: k8s.KubeConfig;
  private batchApi: k8s.BatchV1Api;
  private coreApi: k8s.CoreV1Api;

  private static readonly JOB_RESOURCES: k8s.V1ResourceRequirements = {
    requests: { memory: "512Mi", cpu: "250m" },
    limits: { memory: "2.5Gi", cpu: "1500m" },
  };

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
    this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  private buildJob(params: {
    jobName: string;
    containerName: string;
    image: string;
    args: string[];
    volumeMounts: k8s.V1VolumeMount[];
    volumes: k8s.V1Volume[];
    ttlSecondsAfterFinished: number;
    activeDeadlineSeconds: number;
  }): k8s.V1Job {
    return {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: { name: params.jobName },
      spec: {
        backoffLimit: 0,
        ttlSecondsAfterFinished: params.ttlSecondsAfterFinished,
        activeDeadlineSeconds: params.activeDeadlineSeconds,
        template: {
          metadata: { labels: { job: params.jobName } },
          spec: {
            restartPolicy: "Never",
            containers: [
              {
                name: params.containerName,
                image: params.image,
                resources: OrchestratorService.JOB_RESOURCES,
                imagePullPolicy: "Always",
                args: params.args,
                volumeMounts: params.volumeMounts,
              },
            ],
            volumes: params.volumes,
          },
        },
      },
    };
  }

  private async fetchJobPod(jobName: string): Promise<JobPodInfo | null> {
    const pods = await this.coreApi.listNamespacedPod({
      namespace: "default",
      labelSelector: `job-name=${jobName}`,
    });

    if (!pods.items || pods.items.length === 0) return null;

    const pod = pods.items[0];
    const podName = pod.metadata?.name;
    const containerName = pod.spec?.containers?.[0]?.name;

    if (!podName || !containerName) return null;

    return { pod, podName, containerName, phase: pod.status?.phase };
  }

  async clearJob(clearJobDto: ClearJobDto) {
    try {
      await this.batchApi.deleteNamespacedJob({
        name: clearJobDto.jobName,
        namespace: "default",
        body: {
          propagationPolicy: "Background",
        },
      });
      return { message: "Job deleted", jobName: clearJobDto.jobName };
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.body?.code === 404) {
        return {
          message: "Job not found (already deleted)",
          jobName: clearJobDto.jobName,
        };
      }
      throw error;
    }
  }

  async javaVersion(javaDto: JavaOrchestratorDto) {
    const jobName = `java-version-generator-${Date.now()}`;

    const deployment = this.buildJob({
      jobName,
      containerName: "java-runner",
      image: "tulio3101/omni-java:latest",
      args: [javaDto.REPO_URL],
      volumeMounts: [{ name: "output-java", mountPath: "/java" }],
      volumes: [{ name: "output-java", emptyDir: {} }],
      ttlSecondsAfterFinished: 10,
      activeDeadlineSeconds: 25,
    });

    await this.batchApi.createNamespacedJob({
      namespace: "default",
      body: deployment,
    });

    const output = await this.waitForJobOutput(jobName, 30_000);

    return { javaVersion: output };
  }

  private async waitForJobOutput(
    jobName: string,
    timeoutMs: number,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const info = await this.fetchJobPod(jobName);

      if (!info) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const { podName, containerName, phase } = info;

      if (phase === "Pending" || phase === "Running") {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const logs = await this.coreApi.readNamespacedPodLog({
        name: podName,
        namespace: "default",
        container: containerName,
        follow: false,
      });

      if (phase === "Failed") {
        throw new Error(logs?.trim() || "Job failed with no output");
      }

      return logs?.trim() ?? "";
    }

    throw new Error("Timeout waiting for java version job");
  }

  async runningProject(runProjectDto: CreateRunOrchestratorDto) {
    const jobName = `maven-generator-${Date.now()}`;

    const deployment = this.buildJob({
      jobName,
      containerName: "maven-runner",
      image: `tulio3101/omni-maven-${runProjectDto.JAVA_VERSION}:latest`,
      args: [runProjectDto.REPO_URL],
      volumeMounts: [
        { name: "output-vol", mountPath: "/output" },
        { name: "maven-cache", mountPath: "/root/.m2" },
      ],
      volumes: [
        { name: "output-vol", emptyDir: {} },
        {
          name: "maven-cache",
          hostPath: {
            path: "/home/tulio/.m2-k3s-cache",
            type: "DirectoryOrCreate",
          },
        },
      ],
      ttlSecondsAfterFinished: 120,
      activeDeadlineSeconds: 2400,
    });

    await this.batchApi.createNamespacedJob({
      namespace: "default",
      body: deployment,
    });

    return { message: "Job created", jobName };
  }

  streamLogsToSocket(client: Socket, jobName: string): void {
    let sentLines = 0;

    const pollLogs = async () => {
      try {
        const info = await this.fetchJobPod(jobName);

        if (!info) {
          setTimeout(() => void pollLogs(), 3500);
          return;
        }

        const { podName, containerName, phase } = info;

        if (phase === "Pending") {
          setTimeout(() => void pollLogs(), 2000);
          return;
        }

        const containerRunning =
          info.pod.status?.containerStatuses?.[0]?.state?.running;
        if (phase === "Running" && !containerRunning) {
          setTimeout(() => void pollLogs(), 2000);
          return;
        }

        if (
          phase === "Running" ||
          phase === "Succeeded" ||
          phase === "Failed"
        ) {
          try {
            const logs = await this.coreApi.readNamespacedPodLog({
              name: podName,
              namespace: "default",
              container: containerName,
              follow: false,
            });

            const lines = (logs ?? "").split("\n");
            const newLines = lines.slice(sentLines);
            newLines.forEach((line) => {
              if (line) client.emit("logs:data", line);
            });
            sentLines = lines.length;

            if (phase === "Running") {
              setTimeout(() => void pollLogs(), 2000);
            } else {
              client.emit("logs:complete");
            }
          } catch (logError) {
            console.error("Error reading pod logs:", logError?.message);
            if (phase === "Running") {
              setTimeout(() => void pollLogs(), 2000);
            } else {
              client.emit("logs:error", {
                message: `Error reading logs: ${logError?.message}`,
              });
            }
          }
          return;
        }

        client.emit("logs:error", {
          message: `Unexpected pod phase: ${phase}`,
        });
      } catch (error) {
        console.error("Log polling error:", error?.message);
        client.emit("logs:error", {
          message: error?.message || "Unknown error",
        });
      }
    };

    void pollLogs();
  }
}
