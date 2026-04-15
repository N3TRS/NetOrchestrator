import { WebSocketGateway, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import { Socket } from 'socket.io'
import { OrchestratorService } from "./orchestrator.service";

@WebSocketGateway()
export class OrchestratorGateway {
  constructor(private readonly orchestratorService: OrchestratorService) { }

  @SubscribeMessage('logs')
  async handleLogsRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() jobName: string,
  ) {
    await this.orchestratorService.streamLogsToSocket(client, jobName);
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

}
