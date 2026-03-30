import { NestFactory } from "@nestjs/core";
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
async function bootstrap() {
  const app = await NestFactory.create(OrchestratorModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
