import * as k8s from '@kubernetes/client-node';
import { Test } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn(),
  BatchV1Api: jest.fn(),
  CoreV1Api: jest.fn(),
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let mockBatchApi: { deleteNamespacedJob: jest.Mock; createNamespacedJob: jest.Mock };
  let mockCoreApi: { listNamespacedPod: jest.Mock; readNamespacedPodLog: jest.Mock };

  beforeEach(async () => {
    mockBatchApi = {
      deleteNamespacedJob: jest.fn(),
      createNamespacedJob: jest.fn(),
    };
    mockCoreApi = {
      listNamespacedPod: jest.fn(),
      readNamespacedPodLog: jest.fn(),
    };

    (k8s.KubeConfig as jest.Mock).mockImplementation(() => ({
      loadFromDefault: jest.fn(),
      makeApiClient: (ApiClass: any) =>
        ApiClass === k8s.BatchV1Api ? mockBatchApi : mockCoreApi,
    }));

    const module = await Test.createTestingModule({
      providers: [OrchestratorService],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  // ─── clearJob ────────────────────────────────────────────────────────────────

  describe('clearJob', () => {
    it('returns success message when job deleted', async () => {
      mockBatchApi.deleteNamespacedJob.mockResolvedValue({});
      const result = await service.clearJob({ jobName: 'my-job' });
      expect(result).toEqual({ message: 'Job deleted', jobName: 'my-job' });
    });

    it('returns graceful message on statusCode 404', async () => {
      mockBatchApi.deleteNamespacedJob.mockRejectedValue({ statusCode: 404 });
      const result = await service.clearJob({ jobName: 'my-job' });
      expect(result).toEqual({ message: 'Job not found (already deleted)', jobName: 'my-job' });
    });

    it('returns graceful message on body.code 404', async () => {
      mockBatchApi.deleteNamespacedJob.mockRejectedValue({ body: { code: 404 } });
      const result = await service.clearJob({ jobName: 'my-job' });
      expect(result).toEqual({ message: 'Job not found (already deleted)', jobName: 'my-job' });
    });

    it('rethrows non-404 errors', async () => {
      const err = new Error('K8s server error');
      mockBatchApi.deleteNamespacedJob.mockRejectedValue(err);
      await expect(service.clearJob({ jobName: 'my-job' })).rejects.toThrow('K8s server error');
    });
  });

  // ─── javaVersion ─────────────────────────────────────────────────────────────

  describe('javaVersion', () => {
    const dto = { REPO_URL: 'https://github.com/user/repo' };

    it('returns javaVersion when pod succeeds', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'java-pod-1' },
            spec: { containers: [{ name: 'java-runner' }] },
            status: { phase: 'Succeeded' },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('17.0.1');

      const result = await service.javaVersion(dto);
      expect(result).toEqual({ javaVersion: '17.0.1' });
    });

    it('trims whitespace from javaVersion output', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'java-pod-1' },
            spec: { containers: [{ name: 'java-runner' }] },
            status: { phase: 'Succeeded' },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('  17  \n');

      const result = await service.javaVersion(dto);
      expect(result).toEqual({ javaVersion: '17' });
    });

    it('throws when pod fails with log output', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'java-pod-1' },
            spec: { containers: [{ name: 'java-runner' }] },
            status: { phase: 'Failed' },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('clone failed: repo not found');

      await expect(service.javaVersion(dto)).rejects.toThrow('clone failed: repo not found');
    });

    it('throws default message when pod fails with empty logs', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'java-pod-1' },
            spec: { containers: [{ name: 'java-runner' }] },
            status: { phase: 'Failed' },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('');

      await expect(service.javaVersion(dto)).rejects.toThrow('Job failed with no output');
    });

    it('throws timeout error when deadline exceeded', async () => {
      const realNow = Date.now();
      const dateSpy = jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(realNow)         // javaVersion: `java-version-generator-${Date.now()}`
        .mockReturnValueOnce(realNow)         // waitForJobOutput: deadline = realNow + 30_000
        .mockReturnValue(realNow + 35_000);   // while check: immediately past deadline

      mockBatchApi.createNamespacedJob.mockResolvedValue({});

      await expect(service.javaVersion(dto)).rejects.toThrow(
        'Timeout waiting for java version job',
      );

      dateSpy.mockRestore();
    });
  });

  // ─── runningProject ──────────────────────────────────────────────────────────

  describe('runningProject', () => {
    const dto = {
      REPO_URL: 'https://github.com/user/repo',
      JAVA_VERSION: '17.0.1',
    };

    it('returns job created message with maven-generator- prefix', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      const result = await service.runningProject(dto);
      expect(result).toEqual({
        message: 'Job created',
        jobName: expect.stringContaining('maven-generator-'),
      });
    });

    it('uses JAVA_VERSION in container image name', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      await service.runningProject(dto);

      const callArg = mockBatchApi.createNamespacedJob.mock.calls[0][0];
      const container = callArg.body.spec.template.spec.containers[0];
      expect(container.image).toBe('tulio3101/omni-maven-17.0.1:latest');
    });

    it('passes REPO_URL as container arg', async () => {
      mockBatchApi.createNamespacedJob.mockResolvedValue({});
      await service.runningProject(dto);

      const callArg = mockBatchApi.createNamespacedJob.mock.calls[0][0];
      const container = callArg.body.spec.template.spec.containers[0];
      expect(container.args).toContain('https://github.com/user/repo');
    });

    it('rethrows K8s API errors', async () => {
      const err = new Error('K8s unavailable');
      mockBatchApi.createNamespacedJob.mockRejectedValue(err);
      await expect(service.runningProject(dto)).rejects.toThrow('K8s unavailable');
    });
  });

  // ─── streamLogsToSocket ──────────────────────────────────────────────────────

  describe('streamLogsToSocket', () => {
    let mockClient: { emit: jest.Mock };

    beforeEach(() => {
      // Fake setTimeout/setInterval but keep setImmediate/nextTick real so flushPromises works
      jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
      mockClient = { emit: jest.fn() };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not emit when no pods found yet', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({ items: [] });

      service.streamLogsToSocket(mockClient as any, 'job-123');
      await flushPromises();

      expect(mockClient.emit).not.toHaveBeenCalled();
    });

    it('emits logs:data per line and logs:complete on Succeeded pod', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'pod-1' },
            spec: { containers: [{ name: 'maven-runner' }] },
            status: {
              phase: 'Succeeded',
              containerStatuses: [{ state: { running: null } }],
            },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('line1\nline2\n');

      service.streamLogsToSocket(mockClient as any, 'job-123');
      await flushPromises();

      expect(mockClient.emit).toHaveBeenCalledWith('logs:data', 'line1');
      expect(mockClient.emit).toHaveBeenCalledWith('logs:data', 'line2');
      expect(mockClient.emit).toHaveBeenCalledWith('logs:complete');
    });

    it('emits logs:complete on Failed pod', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'pod-1' },
            spec: { containers: [{ name: 'maven-runner' }] },
            status: {
              phase: 'Failed',
              containerStatuses: [{ state: { running: null } }],
            },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockResolvedValue('build error\n');

      service.streamLogsToSocket(mockClient as any, 'job-123');
      await flushPromises();

      expect(mockClient.emit).toHaveBeenCalledWith('logs:data', 'build error');
      expect(mockClient.emit).toHaveBeenCalledWith('logs:complete');
    });

    it('emits logs:error when log read fails on Succeeded pod', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({
        items: [
          {
            metadata: { name: 'pod-1' },
            spec: { containers: [{ name: 'maven-runner' }] },
            status: {
              phase: 'Succeeded',
              containerStatuses: [{ state: { running: null } }],
            },
          },
        ],
      });
      mockCoreApi.readNamespacedPodLog.mockRejectedValue({ message: 'log stream broken' });

      service.streamLogsToSocket(mockClient as any, 'job-123');
      await flushPromises();

      expect(mockClient.emit).toHaveBeenCalledWith(
        'logs:error',
        expect.objectContaining({ message: expect.stringContaining('log stream broken') }),
      );
    });

    it('emits logs:error on outer polling exception', async () => {
      mockCoreApi.listNamespacedPod.mockRejectedValue({ message: 'network error' });

      service.streamLogsToSocket(mockClient as any, 'job-123');
      await flushPromises();

      expect(mockClient.emit).toHaveBeenCalledWith(
        'logs:error',
        expect.objectContaining({ message: 'network error' }),
      );
    });
  });
});
