import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrisma } from '../test/prisma-mock.helper';

jest.mock('bcrypt');
jest.mock('nanoid', () => ({ nanoid: () => 'mock-refresh-token-64chars' }));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    jwtService = { sign: jest.fn().mockReturnValue('mock-access-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        phone: '09012345678',
        name: 'テスト太郎',
        role: 'elderly',
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        phone: '09012345678',
        name: 'テスト太郎',
        password: 'Password1',
        role: 'elderly' as any,
      });

      expect(result.user.phone).toBe('09012345678');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-64chars');
    });

    it('should throw ConflictException if phone already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          phone: '09012345678',
          name: 'テスト太郎',
          password: 'Password1',
          role: 'elderly' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '09012345678',
        name: 'テスト太郎',
        role: 'elderly',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        phone: '09012345678',
        password: 'Password1',
      });

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ phone: '09012345678', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ phone: '09099999999', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens on valid refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', role: 'elderly' },
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshToken('valid-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(prisma.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw on expired token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', role: 'elderly' },
      });

      await expect(service.refreshToken('expired')).rejects.toThrow(UnauthorizedException);
    });
  });
});
