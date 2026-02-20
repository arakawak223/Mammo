import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
    updateDeviceToken: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      updateDeviceToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = { phone: '09012345678', name: 'テスト', password: 'Pass1234', role: 'elderly' as const };
      const expected = { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const dto = { phone: '09012345678', password: 'Pass1234' };
      const expected = { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshToken with token string', async () => {
      const dto = { refreshToken: 'rt-value' };
      const expected = { accessToken: 'new-at', refreshToken: 'new-rt' };
      authService.refreshToken.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(authService.refreshToken).toHaveBeenCalledWith('rt-value');
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user id and iat', async () => {
      const req = { user: { id: 'u1', iat: 1700000000 } };
      authService.logout.mockResolvedValue({ message: 'ok' });

      const result = await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith('u1', 1700000000);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('updateDeviceToken', () => {
    it('should call authService.updateDeviceToken', async () => {
      const req = { user: { id: 'u1' } };
      const dto = { deviceToken: 'fcm-token-123' };
      authService.updateDeviceToken.mockResolvedValue({ message: 'ok' });

      const result = await controller.updateDeviceToken(req, dto);

      expect(authService.updateDeviceToken).toHaveBeenCalledWith('u1', 'fcm-token-123');
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
