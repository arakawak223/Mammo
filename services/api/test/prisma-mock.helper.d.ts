import { PrismaService } from '../src/prisma/prisma.service';
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
export type MockPrisma = {
    [K in 'user' | 'pairing' | 'inviteCode' | 'event' | 'aiAnalysis' | 'blockedNumber' | 'sosSession' | 'sosSetting' | 'refreshToken']: MockPrismaModel;
};
export declare function createMockPrisma(): MockPrisma & PrismaService;
export {};
//# sourceMappingURL=prisma-mock.helper.d.ts.map