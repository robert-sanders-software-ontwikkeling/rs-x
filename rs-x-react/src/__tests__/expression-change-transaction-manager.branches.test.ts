import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getExpressionChangeTransactionManager branches', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('@rs-x/core');
    vi.unmock('@rs-x/expression-parser');
  });

  it('loads the parser module when the container is not yet bound', async () => {
    const manager = { commit: vi.fn() };
    const isBound = vi.fn(() => false);
    const load = vi.fn();
    const get = vi.fn(() => manager);

    vi.doMock('@rs-x/core', () => ({
      InjectionContainer: { isBound, load, get },
    }));
    vi.doMock('@rs-x/expression-parser', () => ({
      RsXExpressionParserInjectionTokens: {
        IExpressionChangeTransactionManager: Symbol('tx'),
      },
      RsXExpressionParserModule: { id: 'module' },
    }));

    const module = await import('../expression-change-transaction-manager');

    expect(module.getExpressionChangeTransactionManager()).toBe(manager);
    expect(isBound).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('skips loading when the container is already bound', async () => {
    const manager = { commit: vi.fn() };
    const isBound = vi.fn(() => true);
    const load = vi.fn();
    const get = vi.fn(() => manager);

    vi.doMock('@rs-x/core', () => ({
      InjectionContainer: { isBound, load, get },
    }));
    vi.doMock('@rs-x/expression-parser', () => ({
      RsXExpressionParserInjectionTokens: {
        IExpressionChangeTransactionManager: Symbol('tx'),
      },
      RsXExpressionParserModule: { id: 'module' },
    }));

    const module = await import('../expression-change-transaction-manager');

    expect(module.getExpressionChangeTransactionManager()).toBe(manager);
    expect(load).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
  });
});
