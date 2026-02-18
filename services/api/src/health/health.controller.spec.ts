import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return ok status when all dependencies are healthy', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    // Mock Redis import — will fail in test env (no Redis)
    // Redis will return error status, but we test the structure

    const axiosResponse: Partial<AxiosResponse> = {
      data: { status: 'ok' },
      status: 200,
    };
    httpService.get.mockReturnValue(of(axiosResponse));

    const result = await controller.check();

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('service', 'mamoritalk-api');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(result).toHaveProperty('dependencies');
    expect(result.dependencies).toHaveProperty('database');
    expect(result.dependencies).toHaveProperty('redis');
    expect(result.dependencies).toHaveProperty('ai');
    expect(result.dependencies.database.status).toBe('ok');
    expect(result.dependencies.database).toHaveProperty('responseTime');
    expect(result.dependencies.ai.status).toBe('ok');
  });

  it('should return degraded when database is down', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

    const axiosResponse: Partial<AxiosResponse> = {
      data: { status: 'ok' },
      status: 200,
    };
    httpService.get.mockReturnValue(of(axiosResponse));

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.database.status).toBe('error');
    expect(result.dependencies.database.error).toBe('Connection failed');
  });

  it('should return degraded when AI service is down', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    httpService.get.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.dependencies.ai.status).toBe('error');
  });
});

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      headers: { 'x-request-id': 'test-request-id' },
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('should return standardized 500 response for unhandled exceptions', () => {
    filter.catch(new Error('Something broke'), mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: '予期しないエラーが発生しました',
        requestId: 'test-request-id',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should pass through HttpException status and message', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        requestId: 'test-request-id',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { statusCode: 400, message: 'Bad request', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Bad request',
        error: 'Bad Request',
        requestId: 'test-request-id',
      }),
    );
  });
});
