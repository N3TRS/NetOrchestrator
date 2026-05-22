import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { OrchestratorModule } from "./orchestrator/orchestrator.module";
import { Logger, ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(OrchestratorModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? false });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap().catch((err: unknown) => {
  new Logger("Bootstrap").error("Fatal bootstrap error", err);
  process.exit(1);
});
