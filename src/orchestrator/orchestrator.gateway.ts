import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { OrchestratorService } from "./orchestrator.service";

@WebSocketGateway({ path: "/orchestrator/socket.io" })
export class OrchestratorGateway implements OnGatewayConnection {
  private readonly logger = new Logger(OrchestratorGateway.name);

  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly jwtService: JwtService,
  ) {}

  private verifyToken(client: Socket): boolean {
    const handshakeAuth = client.handshake.auth as { token?: string };
    const handshakeHeaders = client.handshake.headers as {
      authorization?: string;
    };
    const token =
      handshakeAuth?.token ??
      handshakeHeaders?.authorization?.replace("Bearer ", "");
    if (!token) return false;
    try {
      this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  handleConnection(client: Socket) {
    if (!this.verifyToken(client)) {
      client.disconnect();
    }
  }

  @SubscribeMessage("logs")
  handleLogsRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobName: string,
  ) {
    if (!this.verifyToken(client)) {
      client.disconnect();
      return;
    }
    this.orchestratorService.streamLogsToSocket(client, jobName);
  }

  @SubscribeMessage("disconnect")
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
