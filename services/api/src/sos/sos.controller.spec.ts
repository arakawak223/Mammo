import { Test, TestingModule } from '@nestjs/testing';
import { SosController, SosSettingsController } from './sos.controller';
import { SosService } from './sos.service';

describe('SosController', () => {
  let controller: SosController;
  let service: {
    start: jest.Mock;
    updateLocation: jest.Mock;
    changeMode: jest.Mock;
    resolve: jest.Mock;
    getSession: jest.Mock;
    getSettings: jest.Mock;
    updateSettings: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      start: jest.fn(),
      updateLocation: jest.fn(),
      changeMode: jest.fn(),
      resolve: jest.fn(),
      getSession: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SosController, SosSettingsController],
      providers: [{ provide: SosService, useValue: service }],
    }).compile();

    controller = module.get<SosController>(SosController);
  });

  it('should start SOS session', async () => {
    const req = { user: { id: 'elderly-1' } };
    const dto = { mode: 'silent', lat: 35.68, lng: 139.76 };
    const expected = { id: 'sos-1', status: 'active' };
    service.start.mockResolvedValue(expected);

    const result = await controller.start(req, dto as any);

    expect(service.start).toHaveBeenCalledWith('elderly-1', dto);
    expect(result).toEqual(expected);
  });

  it('should update location', async () => {
    const dto = { lat: 35.69, lng: 139.77 };
    service.updateLocation.mockResolvedValue({ ok: true });

    const result = await controller.updateLocation('sos-1', dto as any);

    expect(service.updateLocation).toHaveBeenCalledWith('sos-1', dto);
    expect(result).toEqual({ ok: true });
  });

  it('should change mode', async () => {
    const req = { user: { id: 'family-1' } };
    const dto = { mode: 'alarm' };
    service.changeMode.mockResolvedValue({ mode: 'alarm' });

    const result = await controller.changeMode(req, 'sos-1', dto as any);

    expect(service.changeMode).toHaveBeenCalledWith('sos-1', 'alarm', 'family-1');
    expect(result).toEqual({ mode: 'alarm' });
  });

  it('should resolve SOS', async () => {
    const req = { user: { id: 'family-1' } };
    service.resolve.mockResolvedValue({ status: 'resolved' });

    const result = await controller.resolve(req, 'sos-1');

    expect(service.resolve).toHaveBeenCalledWith('sos-1', 'family-1');
    expect(result).toEqual({ status: 'resolved' });
  });

  it('should get session', async () => {
    const expected = { id: 'sos-1', status: 'active', locations: [] };
    service.getSession.mockResolvedValue(expected);

    const result = await controller.getSession('sos-1');

    expect(service.getSession).toHaveBeenCalledWith('sos-1');
    expect(result).toEqual(expected);
  });
});

describe('SosSettingsController', () => {
  let controller: SosSettingsController;
  let service: {
    start: jest.Mock;
    updateLocation: jest.Mock;
    changeMode: jest.Mock;
    resolve: jest.Mock;
    getSession: jest.Mock;
    getSettings: jest.Mock;
    updateSettings: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      start: jest.fn(),
      updateLocation: jest.fn(),
      changeMode: jest.fn(),
      resolve: jest.fn(),
      getSession: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SosSettingsController],
      providers: [{ provide: SosService, useValue: service }],
    }).compile();

    controller = module.get<SosSettingsController>(SosSettingsController);
  });

  it('should get settings', async () => {
    const expected = { defaultMode: 'silent' };
    service.getSettings.mockResolvedValue(expected);

    const result = await controller.getSettings('elderly-1');

    expect(service.getSettings).toHaveBeenCalledWith('elderly-1');
    expect(result).toEqual(expected);
  });

  it('should update settings', async () => {
    const req = { user: { id: 'family-1' } };
    const dto = { mode: 'alarm' };
    service.updateSettings.mockResolvedValue({ defaultMode: 'alarm' });

    const result = await controller.updateSettings(req, 'elderly-1', dto as any);

    expect(service.updateSettings).toHaveBeenCalledWith('elderly-1', 'alarm', 'family-1');
    expect(result).toEqual({ defaultMode: 'alarm' });
  });
});
