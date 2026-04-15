import { Controller, Param, Post, Body, Sse } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";



@Controller("orchestrator")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) { }

  @Post("run")
  runProject(@Body() runProjectDto: CreateRunOrchestratorDto) {
    return this.orchestratorService.runningProject(runProjectDto);
  }

}
