import { IsNotEmpty, IsUrl, Matches } from "class-validator";

export class CreateRunOrchestratorDto {
  @IsNotEmpty()
  @IsUrl({ protocols: ["https"], host_whitelist: ["github.com", "gitlab.com"] })
  REPO_URL: string;

  @IsNotEmpty()
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded {0,3} quantifier prevents exponential backtracking
  @Matches(/^\d+(\.\d+){0,3}$/, {
    message: "JAVA_VERSION must be a valid version number",
  })
  JAVA_VERSION: string;
}
