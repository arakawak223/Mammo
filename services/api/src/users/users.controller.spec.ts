import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUser = {
  id: 'user-1',
  phone: '09012345678',
  name: 'テスト太郎',
  role: 'elderly',
  prefecture: '東京都',
  passwordHash: 'hashed',
  deviceToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUsersService = {
  findById: jest.fn(),
  updateProfile: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  describe('GET /users/me', () => {
    it('should return user profile without passwordHash', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      const req = { user: { id: 'user-1' } };

      const result = await controller.getProfile(req);

      expect(result.id).toBe('user-1');
      expect(result.name).toBe('テスト太郎');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      const req = { user: { id: 'nonexistent' } };

      await expect(controller.getProfile(req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /users/me', () => {
    it('should update and return profile without passwordHash', async () => {
      const updated = { ...mockUser, name: '更新太郎' };
      mockUsersService.updateProfile.mockResolvedValue(updated);
      const req = { user: { id: 'user-1' } };

      const result = await controller.updateProfile(req, { name: '更新太郎' });

      expect(result.name).toBe('更新太郎');
      expect(result).not.toHaveProperty('passwordHash');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-1', { name: '更新太郎' });
    });
  });
});
