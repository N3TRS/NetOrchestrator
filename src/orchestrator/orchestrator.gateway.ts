import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { OrchestratorService } from "./orchestrator.service";

@WebSocketGateway({ path: "/orchestrator/socket.io" })
export class OrchestratorGateway implements OnGatewayConnection {
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
    console.log(`Client disconnected: ${client.id}`);
  }
}
