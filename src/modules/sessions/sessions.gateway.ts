import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Single realtime gateway for the whole app. Clients subscribe to
 * workspace- and session-scoped rooms; feature services push events
 * through the typed `emit*` helpers.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class SessionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SessionsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_workspace')
  joinWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    client.join(`workspace:${data.workspaceId}`);
    return { joined: data.workspaceId };
  }

  @SubscribeMessage('leave_workspace')
  leaveWorkspace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string },
  ) {
    client.leave(`workspace:${data.workspaceId}`);
    return { left: data.workspaceId };
  }

  @SubscribeMessage('join_session')
  joinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    client.join(`session:${data.sessionId}`);
    return { joined: data.sessionId };
  }

  // --- Emit helpers (called from services) ---

  private toWorkspace(workspaceId: string, event: string, payload: any) {
    this.server?.to(`workspace:${workspaceId}`).emit(event, payload);
  }

  private toSession(sessionId: string, event: string, payload: any) {
    this.server?.to(`session:${sessionId}`).emit(event, payload);
  }

  emitSessionStatus(
    workspaceId: string,
    sessionId: string,
    status: string,
    phone?: string | null,
  ) {
    const payload = { sessionId, status, phone };
    this.toSession(sessionId, 'session.status', payload);
    this.toWorkspace(workspaceId, 'session.status', payload);
  }

  emitSessionQr(workspaceId: string, sessionId: string, qr: string) {
    this.toSession(sessionId, 'session.qr', { sessionId, qr });
    this.toWorkspace(workspaceId, 'session.qr', { sessionId, qr });
  }

  emitMessageReceived(workspaceId: string, sessionId: string, payload: any) {
    this.toSession(sessionId, 'message.received', payload);
    this.toWorkspace(workspaceId, 'message.received', payload);
  }

  emitMessageSent(workspaceId: string, sessionId: string, payload: any) {
    this.toSession(sessionId, 'message.sent', payload);
    this.toWorkspace(workspaceId, 'message.sent', payload);
  }

  emitBroadcastProgress(workspaceId: string, payload: any) {
    this.toWorkspace(workspaceId, 'broadcast.progress', payload);
  }

  emitAutomationTriggered(workspaceId: string, payload: any) {
    this.toWorkspace(workspaceId, 'automation.triggered', payload);
  }
}
