"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPrisma = createMockPrisma;
function createMockModel() {
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
function createMockPrisma() {
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
    };
    return mock;
}
//# sourceMappingURL=prisma-mock.helper.js.map