import { IsNotEmpty, IsUrl } from "class-validator";

export class JavaOrchestratorDto {
  @IsNotEmpty()
  @IsUrl({ protocols: ["https"], host_whitelist: ["github.com", "gitlab.com"] })
  REPO_URL: string;
}
