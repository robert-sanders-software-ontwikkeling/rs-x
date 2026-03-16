import { PrettyPrinter } from '../../lib/error-log/pretty-printer';

describe('PrettyPrinter', () => {
  it('formats Date, Map, Set, arrays, and nested plain objects', () => {
    const value = {
      when: new Date('2026-01-02T03:04:05.000Z'),
      data: new Map([
        ['admin', { enabled: true }],
        ['guest', { enabled: false }],
      ]),
      tags: new Set(['A', 'B']),
      list: [1, { deep: ['x'] }],
    };

    const actual = new PrettyPrinter(2).toString(value, true, {
      sortObjectKeys: true,
    });

    expect(actual).toContain('when: 2026-01-02T03:04:05.000Z');
    expect(actual).toContain('admin: {');
    expect(actual).toContain('guest: {');
    expect(actual).toContain('tags: {');
    expect(actual).toContain("'A'");
    expect(actual).toContain("'B'");
    expect(actual).toContain('list: [');
  });

  it('applies maxDepth limit', () => {
    const value = {
      a: {
        b: {
          c: 1,
        },
      },
    };

    const actual = new PrettyPrinter(2).toString(value, true, {
      maxDepth: 1,
      sortObjectKeys: true,
    });

    expect(actual).toContain('b: [MaxDepth]');
  });

  it('marks circular references', () => {
    const value: Record<string, unknown> = {
      name: 'root',
    };
    value.self = value;

    const actual = new PrettyPrinter(2).toString(value, true, {
      sortObjectKeys: true,
    });

    expect(actual).toContain('self: [Circular]');
  });

  it('truncates output by maxChars', () => {
    const value = {
      text: 'x'.repeat(200),
    };

    const actual = new PrettyPrinter(2).toString(value, true, {
      maxChars: 40,
    });

    expect(actual).toContain('… [truncated]');
  });

  it('formats Error on a single line', () => {
    const value = {
      exception: new Error('Oops an error'),
    };

    const actual = new PrettyPrinter(2).toString(value, false);

    expect(actual).toContain('exception: Error: Oops an error');
    expect(actual).not.toContain('stack:');
  });
});
