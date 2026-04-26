import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { OrchestratorService } from "./orchestrator.service";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorGateway } from "./orchestrator.gateway";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [OrchestratorController],
  providers: [OrchestratorService, OrchestratorGateway, JwtAuthGuard],
})
export class OrchestratorModule { }
