import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/ws/sos',
  cors:
    process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS
      ? { origin: process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) }
      : true,
})
export class SosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('SosGateway');

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`SOS WS rejected: no token from ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      (client as any).user = { id: payload.sub, role: payload.role };
      this.logger.log(`SOS WS connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`SOS WS rejected: invalid token from ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`SOS WS disconnected: ${client.id}`);
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
