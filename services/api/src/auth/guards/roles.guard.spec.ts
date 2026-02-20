import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  function createMockContext(userRole: string): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'u1', role: userRole } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = createMockContext('elderly');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['family']);
    const ctx = createMockContext('family');

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny access when user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['family']);
    const ctx = createMockContext('elderly');

    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should allow if user role matches any of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['elderly', 'family']);
    const ctx = createMockContext('elderly');

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
