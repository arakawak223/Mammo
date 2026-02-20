import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AlertsGateway } from './alerts.gateway';

describe('AlertsGateway', () => {
  let gateway: AlertsGateway;
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('test-secret') };
    gateway = new AlertsGateway(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
    // Mock the WebSocket server
    (gateway as any).server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  function createMockClient(auth?: { token?: string }, authHeader?: string) {
    return {
      id: 'client-1',
      handshake: {
        auth: auth || {},
        headers: authHeader ? { authorization: authHeader } : {},
      },
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;
  }

  describe('handleConnection', () => {
    it('should accept connection with valid token', () => {
      jwtService.verify.mockReturnValue({ sub: 'u1', role: 'family' });
      const client = createMockClient({ token: 'valid-jwt' });

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
      expect((client as any).user).toEqual({ id: 'u1', role: 'family' });
    });

    it('should accept connection with Bearer header', () => {
      jwtService.verify.mockReturnValue({ sub: 'u1', role: 'elderly' });
      const client = createMockClient({}, 'Bearer header-jwt');

      gateway.handleConnection(client);

      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection with no token', () => {
      const client = createMockClient();

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should reject connection with invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      const client = createMockClient({ token: 'bad-jwt' });

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect without error', () => {
      const client = createMockClient();
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleSubscribe', () => {
    it('should join alerts room for elderly', () => {
      const client = createMockClient();

      gateway.handleSubscribe(client, 'elderly-1');

      expect(client.join).toHaveBeenCalledWith('alerts:elderly-1');
    });
  });

  describe('handleUnsubscribe', () => {
    it('should leave alerts room', () => {
      const client = createMockClient();

      gateway.handleUnsubscribe(client, 'elderly-1');

      expect(client.leave).toHaveBeenCalledWith('alerts:elderly-1');
    });
  });

  describe('emitNewAlert', () => {
    it('should emit new_alert to elderly room', () => {
      const event = { id: 'evt-1', type: 'suspicious_call' };

      gateway.emitNewAlert('elderly-1', event);

      expect((gateway as any).server.to).toHaveBeenCalledWith('alerts:elderly-1');
      expect((gateway as any).server.emit).toHaveBeenCalledWith('new_alert', event);
    });
  });

  describe('emitAlertResolved', () => {
    it('should emit alert_resolved to elderly room', () => {
      gateway.emitAlertResolved('elderly-1', 'evt-1');

      expect((gateway as any).server.to).toHaveBeenCalledWith('alerts:elderly-1');
      expect((gateway as any).server.emit).toHaveBeenCalledWith('alert_resolved', { eventId: 'evt-1' });
    });
  });
});
