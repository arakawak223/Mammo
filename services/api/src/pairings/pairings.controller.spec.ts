import { Test, TestingModule } from '@nestjs/testing';
import { PairingsController } from './pairings.controller';
import { PairingsService } from './pairings.service';

describe('PairingsController', () => {
  let controller: PairingsController;
  let service: {
    createInvite: jest.Mock;
    joinByCode: jest.Mock;
    getPairings: jest.Mock;
    removePairing: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createInvite: jest.fn(),
      joinByCode: jest.fn(),
      getPairings: jest.fn(),
      removePairing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PairingsController],
      providers: [{ provide: PairingsService, useValue: service }],
    }).compile();

    controller = module.get<PairingsController>(PairingsController);
  });

  it('should create invite code', async () => {
    const req = { user: { id: 'u1' } };
    const expected = { code: 'ABC123', expiresAt: new Date() };
    service.createInvite.mockResolvedValue(expected);

    const result = await controller.createInvite(req, 'elderly-1');

    expect(service.createInvite).toHaveBeenCalledWith('elderly-1', 'u1');
    expect(result).toEqual(expected);
  });

  it('should join by code', async () => {
    const req = { user: { id: 'family-1' } };
    const dto = { code: 'ABC123' };
    const expected = { id: 'p-1', elderlyId: 'e1', familyId: 'family-1' };
    service.joinByCode.mockResolvedValue(expected);

    const result = await controller.join(req, dto as any);

    expect(service.joinByCode).toHaveBeenCalledWith(dto, 'family-1');
    expect(result).toEqual(expected);
  });

  it('should list pairings', async () => {
    const req = { user: { id: 'u1' } };
    const expected = [{ id: 'p-1' }];
    service.getPairings.mockResolvedValue(expected);

    const result = await controller.list(req);

    expect(service.getPairings).toHaveBeenCalledWith('u1');
    expect(result).toEqual(expected);
  });

  it('should remove pairing', async () => {
    const req = { user: { id: 'u1' } };
    service.removePairing.mockResolvedValue({ message: 'deleted' });

    const result = await controller.remove(req, 'p-1');

    expect(service.removePairing).toHaveBeenCalledWith('p-1', 'u1');
    expect(result).toEqual({ message: 'deleted' });
  });
});
