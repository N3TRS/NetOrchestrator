import { Module } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorGateway } from "./orchestrator.gateway";

@Module({
  controllers: [OrchestratorController],
  providers: [OrchestratorService, OrchestratorGateway],
})
export class OrchestratorModule { }
