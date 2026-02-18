import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SosGateway } from './sos.gateway';

describe('SosGateway', () => {
  let gateway: SosGateway;
  let jwtService: { verify: jest.Mock };

  const mockSocket = (auth?: { token?: string }, headers?: Record<string, string>) =>
    ({
      id: 'test-socket-id',
      handshake: { auth: auth || {}, headers: headers || {} },
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
    }) as any;

  beforeEach(async () => {
    jwtService = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SosGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();

    gateway = module.get<SosGateway>(SosGateway);
  });

  it('should disconnect client without token', () => {
    const client = mockSocket();
    gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('should disconnect client with invalid token', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const client = mockSocket({ token: 'bad-token' });
    gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('should accept client with valid token', () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', role: 'elderly' });
    const client = mockSocket({ token: 'valid-token' });
    gateway.handleConnection(client);
    expect(client.disconnect).not.toHaveBeenCalled();
    expect((client as any).user).toEqual({ id: 'user-1', role: 'elderly' });
  });
});
