import { IsNotEmpty } from "class-validator";

export class CreateRunOrchestratorDto {
  @IsNotEmpty()
  REPO_URL: string;
  JAVA_VERSION: string;
}
