import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
} from 'vitest';

// Set up NODE_ENV before any tests run
beforeAll(() => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    writable: true,
    configurable: true,
    enumerable: true,
    value: 'test',
  });
});

describe('Logger', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleInfoSpy: any;
  let consoleDebugSpy: any;
  let logger: any;
  let logError: any;
  let logWarn: any;
  let logInfo: any;
  let logDebug: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Reset modules to allow re-importing with different NODE_ENV
    vi.resetModules();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('error method', () => {
    it('should log error messages', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error with context', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.error('Error with context', { userId: 123, action: 'test' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error with context');
      expect(call).toContain('"userId":123');
    });

    it('should log error with error object', async () => {
      const { logger: l } = await import('@/lib/logger');
      const error = new Error('Test error');
      l.error('Operation failed', undefined, error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('warn method', () => {
    it('should log warn messages', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.warn('Test warn message');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should log warn with context', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.warn('Warning with context', { key: 'value' });
      expect(consoleWarnSpy).toHaveBeenCalled();
      const call = consoleWarnSpy.mock.calls[0][0];
      expect(call).toContain('Warning with context');
    });
  });

  describe('info method', () => {
    it('should log info messages', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.info('Test info message');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should log info with context', async () => {
      const { logger: l } = await import('@/lib/logger');
      l.info('Info with context', { count: 42 });
      expect(consoleInfoSpy).toHaveBeenCalled();
      const call = consoleInfoSpy.mock.calls[0][0];
      expect(call).toContain('Info with context');
    });
  });

  describe('debug method', () => {
    it('should log debug messages in development mode', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
        enumerable: true,
        value: 'development',
      });
      const { logger: l } = await import('@/lib/logger');
      l.debug('Test debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should format debug message with context', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
        enumerable: true,
        value: 'development',
      });
      const { logger: l } = await import('@/lib/logger');
      l.debug('Debug with context', { debug: true });
      expect(consoleDebugSpy).toHaveBeenCalled();
      const call = consoleDebugSpy.mock.calls[0][0];
      expect(call).toContain('Debug with context');
    });
  });

  describe('formatEntry with circular references', () => {
    it('should handle circular references in context (line 34)', async () => {
      const { logger: l } = await import('@/lib/logger');
      const circular: any = { name: 'test' };
      circular.self = circular;
      l.info('Circular test', circular);
      expect(consoleInfoSpy).toHaveBeenCalled();
    });

    it('should handle circular references in error (line 42)', async () => {
      const { logger: l } = await import('@/lib/logger');
      const circularError: any = { message: 'test error' };
      circularError.self = circularError;
      l.error('Error test', undefined, circularError as any);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('logError convenience function', () => {
    it('should call logger.error', async () => {
      const { logError: le } = await import('@/lib/logger');
      le('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should pass context and error', async () => {
      const { logError: le } = await import('@/lib/logger');
      const error = new Error('Test');
      le('Error occurred', { code: 500 }, error);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('logWarn convenience function', () => {
    it('should call logger.warn', async () => {
      const { logWarn: lw } = await import('@/lib/logger');
      lw('Test warn');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should pass context', async () => {
      const { logWarn: lw } = await import('@/lib/logger');
      lw('Warning', { reason: 'test' });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('logInfo convenience function', () => {
    it('should call logger.info', async () => {
      const { logInfo: li } = await import('@/lib/logger');
      li('Test info');
      expect(consoleInfoSpy).toHaveBeenCalled();
    });
  });

  describe('logDebug convenience function', () => {
    it('should call logger.debug in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
        enumerable: true,
        value: 'development',
      });
      const { logDebug: ld } = await import('@/lib/logger');
      ld('Test debug');
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });
});
