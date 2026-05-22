import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

const mockEnd = jest.fn();
const mockStartTimer = jest.fn().mockReturnValue(mockEnd);
const mockInc = jest.fn();

const mockMetricsService = {
  httpRequestDuration: { startTimer: mockStartTimer },
  httpRequestsTotal: { inc: mockInc },
};

const makeContext = (path: string, method = 'GET', statusCode = 200) => ({
  switchToHttp: () => ({
    getRequest: () => ({ path, url: path, method, route: { path } }),
    getResponse: () => ({ statusCode }),
  }),
});

const makeHandler = () => ({ handle: () => of('response') });

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
  });

  it('passes through /metrics without recording metrics', () => {
    const ctx = makeContext('/metrics') as any;
    const handler = makeHandler() as any;

    const result$ = interceptor.intercept(ctx, handler);
    result$.subscribe();

    expect(mockStartTimer).not.toHaveBeenCalled();
    expect(mockInc).not.toHaveBeenCalled();
  });

  it('passes through /metrics?foo=bar without recording metrics', () => {
    const ctx = makeContext('/metrics?foo=bar') as any;
    const handler = makeHandler() as any;

    const result$ = interceptor.intercept(ctx, handler);
    result$.subscribe();

    expect(mockStartTimer).not.toHaveBeenCalled();
  });

  it('records duration timer for non-metrics request', () => {
    const ctx = makeContext('/orchestrator/run', 'POST') as any;
    const handler = makeHandler() as any;

    const result$ = interceptor.intercept(ctx, handler);
    result$.subscribe();

    expect(mockStartTimer).toHaveBeenCalledWith({
      method: 'POST',
      route: '/orchestrator/run',
    });
    expect(mockEnd).toHaveBeenCalled();
  });

  it('increments request counter with correct labels', () => {
    const ctx = makeContext('/orchestrator/java', 'POST', 200) as any;
    const handler = makeHandler() as any;

    const result$ = interceptor.intercept(ctx, handler);
    result$.subscribe();

    expect(mockInc).toHaveBeenCalledWith({
      method: 'POST',
      status: 200,
      route: '/orchestrator/java',
    });
  });
});
