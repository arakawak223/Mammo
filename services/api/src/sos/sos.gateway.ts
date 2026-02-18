import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/ws/sos', cors: true })
export class SosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('SosGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_session')
  handleJoinSession(client: Socket, sessionId: string) {
    client.join(`sos:${sessionId}`);
    this.logger.log(`Client ${client.id} joined session ${sessionId}`);
  }

  @SubscribeMessage('leave_session')
  handleLeaveSession(client: Socket, sessionId: string) {
    client.leave(`sos:${sessionId}`);
  }

  emitLocationUpdate(sessionId: string, location: any) {
    this.server.to(`sos:${sessionId}`).emit('location_update', location);
  }

  emitModeChange(sessionId: string, mode: string) {
    this.server.to(`sos:${sessionId}`).emit('mode_change', { mode });
  }

  emitAudioChunk(sessionId: string, chunk: Buffer) {
    this.server.to(`sos:${sessionId}`).emit('audio_chunk', chunk);
  }

  emitResolved(sessionId: string) {
    this.server.to(`sos:${sessionId}`).emit('resolved');
  }
}
