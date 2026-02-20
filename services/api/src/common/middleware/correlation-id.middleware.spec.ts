import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
  });

  it('should generate a request ID if not provided', () => {
    const req = { headers: {} } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(typeof req.headers['x-request-id']).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.headers['x-request-id']);
    expect(next).toHaveBeenCalled();
  });

  it('should preserve existing request ID from header', () => {
    const req = { headers: { 'x-request-id': 'existing-id-123' } } as any;
    const res = { setHeader: jest.fn() } as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBe('existing-id-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'existing-id-123');
    expect(next).toHaveBeenCalled();
  });
});
