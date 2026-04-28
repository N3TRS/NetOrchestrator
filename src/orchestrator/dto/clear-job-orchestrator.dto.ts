import { IsNotEmpty, Matches } from "class-validator";

export class ClearJobDto {
  @IsNotEmpty()
  @Matches(/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/, {
    message: "jobName must be a valid Kubernetes job name (RFC 1123 DNS label)",
  })
  jobName: string;
}
