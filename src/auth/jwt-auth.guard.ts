import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException();

    try {
      request["user"] = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return null;
    return auth.slice(7);
  }
}
