import { Injectable } from "@nestjs/common";
import * as k8s from "@kubernetes/client-node";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";

@Injectable()
export class OrchestratorService {
  private kc: k8s.KubeConfig;
  private batchApi: k8s.BatchV1Api;

  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromFile("/home/tulio/.kube/config");
    this.batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
  }

  runningProject(runProjectDto: CreateRunOrchestratorDto) {
    return "Running Project";
  }
}
