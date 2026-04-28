import {
  Controller,
  Param,
  Post,
  Body,
  Sse,
  HttpException,
  UseGuards,
} from "@nestjs/common";
import { OrchestratorService } from "./orchestrator.service";
import { CreateRunOrchestratorDto } from "./dto/create-run-orchestrator.dto";
import { JavaOrchestratorDto } from "./dto/java-orchestrator.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ClearJobDto } from "./dto/clear-job-orchestrator.dto";

@UseGuards(JwtAuthGuard)
@Controller("orchestrator")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post("run")
  runProject(@Body() runProjectDto: CreateRunOrchestratorDto) {
    return this.orchestratorService.runningProject(runProjectDto);
  }

  @Post("java")
  async getJavaVersion(@Body() javaProjectDto: JavaOrchestratorDto) {
    try {
      return await this.orchestratorService.javaVersion(javaProjectDto);
    } catch (error) {
      const msg: string = error?.message ?? "Unknown error";
      if (msg.includes("Timeout")) {
        throw new HttpException("Java version detection timed out", 504);
      }
      throw new HttpException(
        { message: "Could not detect Java version", detail: msg },
        422,
      );
    }
  }

  @Post("clear")
  async clearJobs(@Body() clearJobDto: ClearJobDto) {
    return await this.orchestratorService.clearJob(clearJobDto);
  }
}
