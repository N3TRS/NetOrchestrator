import { IsNotEmpty } from "class-validator";

export class CreateRunOrchestratorDto {
  @IsNotEmpty()
  javaVersion: string;
}
