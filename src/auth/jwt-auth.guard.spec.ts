import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";

const mockJwtService = {
  verify: jest.fn(),
};

const makeContext = (headers: Record<string, string> = {}) => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers }),
  }),
});

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  describe("extractToken", () => {
    it("returns token from valid Bearer header", () => {
      const req: any = { headers: { authorization: "Bearer mytoken123" } };
      expect(guard.extractToken(req)).toBe("mytoken123");
    });

    it("returns null when no authorization header", () => {
      const req: any = { headers: {} };
      expect(guard.extractToken(req)).toBeNull();
    });

    it("returns null for wrong scheme", () => {
      const req: any = { headers: { authorization: "Token mytoken123" } };
      expect(guard.extractToken(req)).toBeNull();
    });

    it("returns null for Basic auth", () => {
      const req: any = { headers: { authorization: "Basic dXNlcjpwYXNz" } };
      expect(guard.extractToken(req)).toBeNull();
    });
  });

  describe("canActivate", () => {
    it("returns true and sets request.user on valid token", () => {
      const payload = { sub: "user-1", email: "a@b.com" };
      mockJwtService.verify.mockReturnValue(payload);

      const request: any = { headers: { authorization: "Bearer validtoken" } };
      const ctx: any = {
        switchToHttp: () => ({ getRequest: () => request }),
      };

      expect(guard.canActivate(ctx)).toBe(true);
      expect(request.user).toEqual(payload);
    });

    it("throws UnauthorizedException when no token", () => {
      const ctx: any = makeContext();
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when token is invalid", () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("invalid signature");
      });
      const ctx: any = makeContext({ authorization: "Bearer badtoken" });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when token is expired", () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });
      const ctx: any = makeContext({ authorization: "Bearer expiredtoken" });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });
});
