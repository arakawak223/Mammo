import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: { verify: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('test-secret') };
    guard = new WsJwtGuard(
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  function createWsContext(auth?: { token?: string }, authHeader?: string) {
    const client = {
      id: 'socket-1',
      handshake: {
        auth: auth || {},
        headers: authHeader ? { authorization: authHeader } : {},
      },
      disconnect: jest.fn(),
    };
    return {
      context: {
        switchToWs: () => ({ getClient: () => client }),
      } as unknown as ExecutionContext,
      client,
    };
  }

  it('should allow connection with valid auth token', () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', role: 'elderly' });
    const { context, client } = createWsContext({ token: 'valid-jwt' });

    expect(guard.canActivate(context)).toBe(true);
    expect((client as any).user).toEqual({ id: 'u1', role: 'elderly' });
    expect(jwtService.verify).toHaveBeenCalledWith('valid-jwt', { secret: 'test-secret' });
  });

  it('should allow connection with Bearer header token', () => {
    jwtService.verify.mockReturnValue({ sub: 'u1', role: 'family' });
    const { context } = createWsContext({}, 'Bearer header-jwt');

    expect(guard.canActivate(context)).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('header-jwt', { secret: 'test-secret' });
  });

  it('should reject connection with no token', () => {
    const { context, client } = createWsContext();

    expect(guard.canActivate(context)).toBe(false);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('should reject connection with invalid token', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    const { context, client } = createWsContext({ token: 'bad-jwt' });

    expect(guard.canActivate(context)).toBe(false);
    expect(client.disconnect).toHaveBeenCalled();
  });
});
