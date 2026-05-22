jest.mock("@kubernetes/client-node", () => ({
  KubeConfig: jest.fn(),
  BatchV1Api: jest.fn(),
  CoreV1Api: jest.fn(),
}));

import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { OrchestratorGateway } from "./orchestrator.gateway";
import { OrchestratorService } from "./orchestrator.service";

const mockJwtService = { verify: jest.fn() };
const mockOrchestratorService = { streamLogsToSocket: jest.fn() };

const makeClient = (auth: any = {}, headers: any = {}) => ({
  id: "test-client-id",
  handshake: { auth, headers },
  disconnect: jest.fn(),
  emit: jest.fn(),
});

describe("OrchestratorGateway", () => {
  let gateway: OrchestratorGateway;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        OrchestratorGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: OrchestratorService, useValue: mockOrchestratorService },
      ],
    }).compile();

    gateway = module.get<OrchestratorGateway>(OrchestratorGateway);
  });

  // ─── handleConnection ────────────────────────────────────────────────────────

  describe("handleConnection", () => {
    it("verifies token from handshake.auth.token and does not disconnect", () => {
      mockJwtService.verify.mockReturnValue({ sub: "user-1" });
      const client = makeClient({ token: "valid-token" }) as any;

      gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith("valid-token");
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("verifies token from Authorization header and does not disconnect", () => {
      mockJwtService.verify.mockReturnValue({ sub: "user-1" });
      const client = makeClient(
        {},
        { authorization: "Bearer header-token" },
      ) as any;

      gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith("header-token");
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("disconnects when no token provided", () => {
      const client = makeClient() as any;
      gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it("disconnects when token is invalid", () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("invalid signature");
      });
      const client = makeClient({ token: "bad-token" }) as any;

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it("prefers handshake.auth.token over Authorization header", () => {
      mockJwtService.verify.mockReturnValue({});
      const client = makeClient(
        { token: "auth-token" },
        { authorization: "Bearer header-token" },
      ) as any;

      gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith("auth-token");
    });
  });

  // ─── handleLogsRequest ───────────────────────────────────────────────────────

  describe("handleLogsRequest", () => {
    it("calls streamLogsToSocket with client and jobName", async () => {
      mockOrchestratorService.streamLogsToSocket.mockResolvedValue(undefined);
      const client = makeClient({ token: "valid-token" }) as any;
      const jobName = "maven-generator-1234";

      await gateway.handleLogsRequest(client, jobName);

      expect(mockOrchestratorService.streamLogsToSocket).toHaveBeenCalledWith(
        client,
        jobName,
      );
    });
  });
});
