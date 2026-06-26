import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.LOG_LEVEL = originalLogLevel;
  });

  describe('with default LOG_LEVEL (info)', () => {
    beforeEach(() => {
      delete process.env.LOG_LEVEL;
      vi.resetModules();
    });

    it('logs info level messages', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('test message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    it('suppresses debug level messages', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.debug('should not appear');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('outputs formatted JSON for info', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('hello');
      const call = (console.log as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('hello');
      expect(parsed.timestamp).toBeDefined();
    });

    it('includes context fields in JSON output', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('request', { requestId: 'abc-123', method: 'GET' });
      const call = (console.log as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.requestId).toBe('abc-123');
      expect(parsed.method).toBe('GET');
    });
  });

  describe('with LOG_LEVEL = debug', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'debug';
      vi.resetModules();
    });

    it('logs debug messages', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.debug('debug message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    it('uses console.log for debug', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.debug('dbg');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('with LOG_LEVEL = error', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'error';
      vi.resetModules();
    });

    it('suppresses info but logs error', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('should not appear');
      logger.error('should appear');
      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('with LOG_LEVEL = warn', () => {
    beforeEach(() => {
      process.env.LOG_LEVEL = 'warn';
      vi.resetModules();
    });

    it('suppresses info but logs warn', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('should not appear');
      logger.warn('should appear');
      expect(console.log).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('output routing', () => {
    beforeEach(() => {
      delete process.env.LOG_LEVEL;
      vi.resetModules();
    });

    it('uses console.error for error level', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.error('fail');
      expect(console.error).toHaveBeenCalled();
    });

    it('uses console.warn for warn level', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.warn('caution');
      expect(console.warn).toHaveBeenCalled();
    });

    it('uses console.log for info level', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.info('info');
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('request logger', () => {
    beforeEach(() => {
      delete process.env.LOG_LEVEL;
      vi.resetModules();
    });

    it('logs info for 2xx status', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.request({ requestId: 'r1', method: 'GET', path: '/api/quests', status: 200, duration: 45 });
      expect(console.log).toHaveBeenCalled();
    });

    it('logs warn for 4xx status', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.request({ requestId: 'r2', method: 'POST', path: '/api/quests', status: 404, duration: 10 });
      expect(console.warn).toHaveBeenCalled();
    });

    it('logs error for 5xx status', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.request({ requestId: 'r3', method: 'GET', path: '/api/quests', status: 500, duration: 100 });
      expect(console.error).toHaveBeenCalled();
    });

    it('formats message with method, path, status, duration', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.request({ requestId: 'r1', method: 'GET', path: '/api/quests', status: 200, duration: 45 });
      const call = (console.log as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.message).toBe('GET /api/quests → 200 (45ms)');
    });

    it('appends error message to log line', async () => {
      const { logger } = await import('@/lib/logging/logger');
      logger.request({ requestId: 'r1', method: 'GET', path: '/api/quests', status: 500, duration: 50, error: 'timeout' });
      const call = (console.error as any).mock.calls[0][0];
      const parsed = JSON.parse(call);
      expect(parsed.message).toContain('timeout');
    });
  });
});
