import { Controller, Post, Body } from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";

@Controller("orchestrator")
export class OrchestratorController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly runProjectDto: CreateRunOrchestratorDto,
  ) {}

  @Post("run")
  runProject(@Body() runProjectDto: CreateRunOrchestratorDto) {
    return this.orchestratorService.runningProject(runProjectDto);
  }
}
