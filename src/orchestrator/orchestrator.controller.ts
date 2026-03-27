import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { CreateOrchestratorDto } from './dto/create-orchestrator.dto';


@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) { }

  @Post('create')
  create(@Body() createOrchestratorDto: CreateOrchestratorDto) {
    return this.orchestratorService.create(createOrchestratorDto);
  }
}
