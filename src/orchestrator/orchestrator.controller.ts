import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { CreateOrchestratorDto } from "./dto/create-orchestrator.dto";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";

@Controller("orchestrator")
export class OrchestratorController {
  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly runProjectDto: CreateRunOrchestratorDto,
  ) {}

  @Post("create")
  create(@Body() createOrchestratorDto: CreateOrchestratorDto) {
    return this.orchestratorService.create(createOrchestratorDto);
  }

  @Post("run")
  run(@Body() runProjectDto: CreateRunOrchestratorDto) {
    return "Hey";
  }
}
