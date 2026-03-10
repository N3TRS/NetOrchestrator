import { NestFactory } from '@nestjs/core';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
async function bootstrap() {
  const app = await NestFactory.create(OrchestratorModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
