import { describe, expect, it } from 'vitest';

import { getExpressionChangeTransactionManager } from '../expression-change-transaction-manager';

describe('getExpressionChangeTransactionManager', () => {
  it('returns a singleton instance with transaction methods', () => {
    const first = getExpressionChangeTransactionManager();
    const second = getExpressionChangeTransactionManager();

    expect(first).toBe(second);
    expect(typeof first.suspend).toBe('function');
    expect(typeof first.continue).toBe('function');
    expect(typeof first.commit).toBe('function');
    expect(typeof first.subscribeCommitted).toBe('function');
  });
});
