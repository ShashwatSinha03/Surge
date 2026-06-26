import { describe, it, expect } from 'vitest';
import { generateRequestId, getRequestId, REQUEST_ID_HEADER } from '@/lib/request/correlation';

describe('generateRequestId', () => {
  it('returns a string', () => {
    const id = generateRequestId();
    expect(typeof id).toBe('string');
  });

  it('returns a UUID-formatted string', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns unique values on successive calls', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });
});

describe('REQUEST_ID_HEADER', () => {
  it('is x-request-id', () => {
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
  });
});

describe('getRequestId', () => {
  it('extracts requestId from header when present', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-request-id': 'existing-id' },
    });
    expect(getRequestId(req)).toBe('existing-id');
  });

  it('generates new requestId when header is absent', () => {
    const req = new Request('https://example.com');
    const id = getRequestId(req);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
