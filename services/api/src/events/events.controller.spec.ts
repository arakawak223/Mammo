import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: {
    create: jest.Mock;
    findByElderly: jest.Mock;
    findById: jest.Mock;
    resolve: jest.Mock;
  };

  beforeEach(async () => {
    eventsService = {
      create: jest.fn(),
      findByElderly: jest.fn(),
      findById: jest.fn(),
      resolve: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: eventsService }],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  describe('create', () => {
    it('should create event with user id and dto', async () => {
      const req = { user: { id: 'u1' } };
      const dto = { type: 'suspicious_call', phoneNumber: '03-1234-5678' };
      const expected = { id: 'evt-1', type: 'suspicious_call' };
      eventsService.create.mockResolvedValue(expected);

      const result = await controller.create(req, dto as any);

      expect(eventsService.create).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('findByElderly', () => {
    it('should return paginated events', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20 };
      eventsService.findByElderly.mockResolvedValue(expected);

      const result = await controller.findByElderly('elderly-1', '2', '10');

      expect(eventsService.findByElderly).toHaveBeenCalledWith('elderly-1', 2, 10);
      expect(result).toEqual(expected);
    });

    it('should pass undefined for missing page/limit', async () => {
      eventsService.findByElderly.mockResolvedValue({ data: [] });

      await controller.findByElderly('elderly-1');

      expect(eventsService.findByElderly).toHaveBeenCalledWith('elderly-1', undefined, undefined);
    });
  });

  describe('findById', () => {
    it('should return event details', async () => {
      const expected = { id: 'evt-1', type: 'suspicious_call', aiAnalysis: {} };
      eventsService.findById.mockResolvedValue(expected);

      const result = await controller.findById('evt-1');

      expect(eventsService.findById).toHaveBeenCalledWith('evt-1');
      expect(result).toEqual(expected);
    });
  });

  describe('resolve', () => {
    it('should mark event as resolved', async () => {
      const req = { user: { id: 'family-1' } };
      const expected = { id: 'evt-1', resolvedAt: new Date() };
      eventsService.resolve.mockResolvedValue(expected);

      const result = await controller.resolve(req, 'evt-1');

      expect(eventsService.resolve).toHaveBeenCalledWith('evt-1', 'family-1');
      expect(result).toEqual(expected);
    });
  });
});
