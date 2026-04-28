import { IsNotEmpty } from "class-validator";

export class ClearJobDto {

  @IsNotEmpty()
  jobName: string

}
