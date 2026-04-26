import { IsNotEmpty, IsUrl, Matches } from "class-validator";

export class CreateRunOrchestratorDto {
  @IsNotEmpty()
  @IsUrl({ protocols: ['https'], host_whitelist: ['github.com', 'gitlab.com'] })
  REPO_URL: string;

  @IsNotEmpty()
  @Matches(/^\d+(\.\d+)*$/, { message: 'JAVA_VERSION must be a valid version number' })
  JAVA_VERSION: string;
}
