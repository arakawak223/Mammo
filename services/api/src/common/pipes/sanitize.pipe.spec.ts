import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  const bodyMetadata = { type: 'body' as const, metatype: Object, data: '' };
  const queryMetadata = { type: 'query' as const, metatype: Object, data: '' };

  it('should strip HTML tags from strings', () => {
    const input = { name: '<b>太郎</b>' };
    const result = pipe.transform(input, bodyMetadata);
    expect(result.name).toBe('太郎');
  });

  it('should strip script tags with content', () => {
    const input = { text: 'hello<script>alert("xss")</script>world' };
    const result = pipe.transform(input, bodyMetadata);
    expect(result.text).toBe('helloworld');
  });

  it('should handle nested objects', () => {
    const input = { payload: { text: '<img src=x onerror=alert(1)>test' } };
    const result = pipe.transform(input, bodyMetadata);
    expect(result.payload.text).toBe('test');
  });

  it('should handle arrays', () => {
    const input = { items: ['<b>a</b>', '<i>b</i>'] };
    const result = pipe.transform(input, bodyMetadata);
    expect(result.items).toEqual(['a', 'b']);
  });

  it('should not sanitize non-body metadata', () => {
    const input = { name: '<b>test</b>' };
    const result = pipe.transform(input, queryMetadata);
    expect(result.name).toBe('<b>test</b>');
  });

  it('should preserve non-string values', () => {
    const input = { count: 42, active: true, name: '<b>test</b>' };
    const result = pipe.transform(input, bodyMetadata);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.name).toBe('test');
  });
});
