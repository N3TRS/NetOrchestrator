import { Module } from '@nestjs/common';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics/metrics.service';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsInterceptor } from './metrics/metrics.interceptor';

@Module({
  imports: [OrchestratorModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
