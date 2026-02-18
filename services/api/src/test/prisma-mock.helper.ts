import { PrismaService } from '../prisma/prisma.service';

type MockPrismaModel = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
};

function createMockModel(): MockPrismaModel {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

export type MockPrisma = {
  [K in
    | 'user'
    | 'pairing'
    | 'inviteCode'
    | 'event'
    | 'aiAnalysis'
    | 'blockedNumber'
    | 'sosSession'
    | 'sosSetting'
    | 'refreshToken']: MockPrismaModel;
};

export function createMockPrisma(): MockPrisma & PrismaService {
  const mock = {
    user: createMockModel(),
    pairing: createMockModel(),
    inviteCode: createMockModel(),
    event: createMockModel(),
    aiAnalysis: createMockModel(),
    blockedNumber: createMockModel(),
    sosSession: createMockModel(),
    sosSetting: createMockModel(),
    refreshToken: createMockModel(),
  } as any;
  return mock;
}
