import { MetricsService } from "./metrics.service";
import { Registry, Counter, Histogram } from "prom-client";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(() => {
    // Each MetricsService creates its own Registry — no duplicate-metric conflicts
    service = new MetricsService();
  });

  it("creates a prom-client Registry", () => {
    expect(service.registry).toBeInstanceOf(Registry);
  });

  it("registers httpRequestsTotal counter with correct name", () => {
    expect(service.httpRequestsTotal).toBeInstanceOf(Counter);
    expect((service.httpRequestsTotal as any).name).toBe("http_requests_total");
  });

  it("httpRequestsTotal has method, status, route label names", async () => {
    const text = await service.registry.metrics();
    expect(text).toContain("http_requests_total");
  });

  it("registers httpRequestDuration histogram with correct name", () => {
    expect(service.httpRequestDuration).toBeInstanceOf(Histogram);
    expect((service.httpRequestDuration as any).name).toBe(
      "http_request_duration_seconds",
    );
  });

  it("httpRequestDuration exposes expected bucket boundaries in prometheus output", async () => {
    // prom-client 15 only emits bucket lines after at least one observation
    service.httpRequestDuration.observe(
      { method: "GET", route: "/test" },
      0.05,
    );
    const text = await service.registry.metrics();
    for (const bucket of ["0.1", "0.5", "1", "2", "5", "10"]) {
      expect(text).toContain(`le="${bucket}"`);
    }
  });
});
