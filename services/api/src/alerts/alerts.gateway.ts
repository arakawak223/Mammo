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
  namespace: '/ws/alerts',
  cors:
    process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS
      ? { origin: process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) }
      : true,
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('AlertsGateway');

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`Alert WS rejected: no token from ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      (client as any).user = { id: payload.sub, role: payload.role };
      this.logger.log(`Alert WS connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      this.logger.warn(`Alert WS rejected: invalid token from ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Alert WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_elderly')
  handleSubscribe(client: Socket, elderlyId: string) {
    client.join(`alerts:${elderlyId}`);
    this.logger.log(`Client ${client.id} subscribed to alerts for elderly ${elderlyId}`);
  }

  @SubscribeMessage('unsubscribe_elderly')
  handleUnsubscribe(client: Socket, elderlyId: string) {
    client.leave(`alerts:${elderlyId}`);
  }

  emitNewAlert(elderlyId: string, event: any) {
    this.server.to(`alerts:${elderlyId}`).emit('new_alert', event);
  }

  emitAlertResolved(elderlyId: string, eventId: string) {
    this.server.to(`alerts:${elderlyId}`).emit('alert_resolved', { eventId });
  }
}
