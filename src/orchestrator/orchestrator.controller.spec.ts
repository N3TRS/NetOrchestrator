jest.mock("@kubernetes/client-node", () => ({
  KubeConfig: jest.fn(),
  BatchV1Api: jest.fn(),
  CoreV1Api: jest.fn(),
}));

import { HttpException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { OrchestratorController } from "./orchestrator.controller";
import { OrchestratorService } from "./orchestrator.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

const mockOrchestratorService = {
  runningProject: jest.fn(),
  javaVersion: jest.fn(),
  clearJob: jest.fn(),
};

describe("OrchestratorController", () => {
  let controller: OrchestratorController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [OrchestratorController],
      providers: [
        { provide: OrchestratorService, useValue: mockOrchestratorService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrchestratorController>(OrchestratorController);
  });

  // ─── runProject ───────────────────────────────────────────────────────────────

  describe("runProject", () => {
    it("delegates to orchestratorService.runningProject and returns result", () => {
      const dto = {
        REPO_URL: "https://github.com/user/repo",
        JAVA_VERSION: "17",
      };
      const expected = {
        message: "Job created",
        jobName: "maven-generator-123",
      };
      mockOrchestratorService.runningProject.mockReturnValue(expected);

      expect(controller.runProject(dto as any)).toEqual(expected);
      expect(mockOrchestratorService.runningProject).toHaveBeenCalledWith(dto);
    });
  });

  // ─── getJavaVersion ──────────────────────────────────────────────────────────

  describe("getJavaVersion", () => {
    const dto = { REPO_URL: "https://github.com/user/repo" };

    it("returns javaVersion on success", async () => {
      mockOrchestratorService.javaVersion.mockResolvedValue({
        javaVersion: "17",
      });
      const result = await controller.getJavaVersion(dto as any);
      expect(result).toEqual({ javaVersion: "17" });
    });

    it("throws 504 HttpException on timeout error", async () => {
      mockOrchestratorService.javaVersion.mockRejectedValue(
        new Error("Timeout waiting for java version job"),
      );

      await expect(controller.getJavaVersion(dto as any)).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.getJavaVersion(dto as any);
      } catch (e: any) {
        expect(e.getStatus()).toBe(504);
        expect(e.message).toBe("Java version detection timed out");
      }
    });

    it("throws 422 HttpException with detail on other errors", async () => {
      mockOrchestratorService.javaVersion.mockRejectedValue(
        new Error("clone failed: not found"),
      );

      try {
        await controller.getJavaVersion(dto as any);
        fail("should have thrown");
      } catch (e: any) {
        expect(e).toBeInstanceOf(HttpException);
        expect(e.getStatus()).toBe(422);
        const body = e.getResponse();
        expect(body.message).toBe("Could not detect Java version");
        expect(body.detail).toBe("clone failed: not found");
      }
    });

    it('throws 422 with "Unknown error" detail when error has no message', async () => {
      mockOrchestratorService.javaVersion.mockRejectedValue({});

      try {
        await controller.getJavaVersion(dto as any);
        fail("should have thrown");
      } catch (e: any) {
        expect(e.getStatus()).toBe(422);
        const body = e.getResponse();
        expect(body.detail).toBe("Unknown error");
      }
    });
  });

  // ─── clearJobs ───────────────────────────────────────────────────────────────

  describe("clearJobs", () => {
    it("delegates to orchestratorService.clearJob and returns result", async () => {
      const dto = { jobName: "maven-generator-123" };
      const expected = {
        message: "Job deleted",
        jobName: "maven-generator-123",
      };
      mockOrchestratorService.clearJob.mockResolvedValue(expected);

      const result = await controller.clearJobs(dto as any);
      expect(result).toEqual(expected);
      expect(mockOrchestratorService.clearJob).toHaveBeenCalledWith(dto);
    });
  });
});
