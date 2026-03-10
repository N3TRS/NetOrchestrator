import { IsNotEmpty } from 'class-validator';


export class CreateOrchestratorDto {

  // ToDo -> Group: una expresion regular con puntos
  // package name: Groupos 
  // spring_version -> 3.5.11 - 4.0.3
  // java_version -> 25 - 21 - 17
  // Verificar todo lo anterior mediante class-validator
  @IsNotEmpty()
  container_id: string;
  @IsNotEmpty()
  group: string;
  @IsNotEmpty()
  artifact: string;
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  description: string;
  @IsNotEmpty()
  package_name: string;
  @IsNotEmpty()
  java_version: string;
  @IsNotEmpty()
  spring_version: string;

}
