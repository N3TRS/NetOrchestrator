import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(OrchestratorModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap();
