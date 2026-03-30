import { IsNotEmpty } from "class-validator";

export class CreateRunOrchestratorDto {
  // TODO: -> Group: una expresion regular con puntos
  // package name: Groupos
  // spring_version -> 3.5.11 - 4.0.3
  // java_version -> 25 - 21 - 17
  // Verificar todo lo anterior mediante class-validator
  @IsNotEmpty()
  javaVersion: string;
}
