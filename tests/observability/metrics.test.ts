import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper to get fresh module state for each describe block
async function freshMetrics() {
  vi.resetModules();
  return import('@/lib/observability/metrics');
}

describe('emitMetric', () => {
  beforeEach(() => { vi.resetModules(); });

  it('notifies registered observers', async () => {
    const { addMetricObserver, emitMetric } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    emitMetric({ type: 'test', value: 42 });
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'test', value: 42 }),
    );
  });

  it('notifies multiple observers', async () => {
    const { addMetricObserver, emitMetric } = await freshMetrics();
    const o1 = vi.fn();
    const o2 = vi.fn();
    addMetricObserver(o1);
    addMetricObserver(o2);

    emitMetric({ type: 'multi' });
    expect(o1).toHaveBeenCalledTimes(1);
    expect(o2).toHaveBeenCalledTimes(1);
  });

  it('suppresses observer exceptions', async () => {
    const { addMetricObserver, emitMetric } = await freshMetrics();
    addMetricObserver(() => { throw new Error('observer error'); });
    expect(() => emitMetric({ type: 'boom' })).not.toThrow();
  });
});

describe('addMetricObserver', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns unsubscribe function that stops notifications', async () => {
    const { addMetricObserver, emitMetric } = await freshMetrics();
    const observer = vi.fn();
    const unsubscribe = addMetricObserver(observer);

    unsubscribe();
    emitMetric({ type: 'after-unsub' });
    expect(observer).not.toHaveBeenCalled();
  });

  it('handles double unsubscribe gracefully', async () => {
    const { addMetricObserver, emitMetric } = await freshMetrics();
    const observer = vi.fn();
    const unsubscribe = addMetricObserver(observer);
    unsubscribe();
    unsubscribe();
    emitMetric({ type: 'double' });
    expect(observer).not.toHaveBeenCalled();
  });
});

describe('emitError', () => {
  beforeEach(() => { vi.resetModules(); });

  it('notifies registered error observers', async () => {
    const { addErrorObserver, emitError } = await freshMetrics();
    const observer = vi.fn();
    addErrorObserver(observer);

    emitError({ message: 'something went wrong', code: 'ERR_1' });
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'something went wrong', code: 'ERR_1' }),
    );
  });

  it('suppresses observer exceptions', async () => {
    const { addErrorObserver, emitError } = await freshMetrics();
    addErrorObserver(() => { throw new Error('nope'); });
    expect(() => emitError({ message: 'fail' })).not.toThrow();
  });
});

describe('addErrorObserver', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns unsubscribe function', async () => {
    const { addErrorObserver, emitError } = await freshMetrics();
    const observer = vi.fn();
    const unsubscribe = addErrorObserver(observer);
    unsubscribe();
    emitError({ message: 'gone' });
    expect(observer).not.toHaveBeenCalled();
  });
});

describe('trackApiCall', () => {
  beforeEach(() => { vi.resetModules(); });

  it('emits a metric event with api_call type', async () => {
    const { addMetricObserver, trackApiCall } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    trackApiCall('GET', '/api/quests/abc/milestones', 200, 45);
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api_call',
        tags: expect.objectContaining({
          method: 'GET',
          status: '200',
        }),
        value: 45,
      }),
    );
  });

  it('truncates path to first 4 segments from split', async () => {
    const { addMetricObserver, trackApiCall } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    trackApiCall('POST', '/api/quests/abc/actions/def', 201, 30);
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ path: '/api/quests/abc' }),
      }),
    );
  });

  it('handles short paths', async () => {
    const { addMetricObserver, trackApiCall } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    trackApiCall('GET', '/api/health', 200, 5);
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.objectContaining({ path: '/api/health' }),
      }),
    );
  });
});

describe('trackDomainEvent', () => {
  beforeEach(() => { vi.resetModules(); });

  it('emits a metric with domain_event type', async () => {
    const { addMetricObserver, trackDomainEvent } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    trackDomainEvent('ACTION_COMPLETED');
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'domain_event',
        tags: { event_type: 'ACTION_COMPLETED' },
        value: 1,
      }),
    );
  });
});

describe('trackError', () => {
  beforeEach(() => { vi.resetModules(); });

  it('emits to error observers', async () => {
    const { addErrorObserver, trackError } = await freshMetrics();
    const observer = vi.fn();
    addErrorObserver(observer);

    trackError('failure', 'ERR_5', { service: 'auth' });
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'failure',
        code: 'ERR_5',
        tags: { service: 'auth' },
      }),
    );
  });
});

describe('trackRateLimit', () => {
  beforeEach(() => { vi.resetModules(); });

  it('emits a metric with rate_limit type', async () => {
    const { addMetricObserver, trackRateLimit } = await freshMetrics();
    const observer = vi.fn();
    addMetricObserver(observer);

    trackRateLimit('ip:1.2.3.4', 'auth');
    expect(observer).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rate_limit',
        tags: { category: 'auth' },
        value: 1,
      }),
    );
  });
});
