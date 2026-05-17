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

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ??
      client.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      this.jwtService.verify(token);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage("logs")
  async handleLogsRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobName: string,
  ) {
    await this.orchestratorService.streamLogsToSocket(client, jobName);
  }

  @SubscribeMessage("disconnect")
  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
