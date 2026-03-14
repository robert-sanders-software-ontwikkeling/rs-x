import type { IIndexValueAccessor } from '../../lib/index-value-accessor/index-value-accessor.interface';
import { IndexValueAccessor } from '../../lib/index-value-accessor/index-value-accessor';

interface IAccessorMock extends IIndexValueAccessor<unknown, unknown> {
  applies: jest.Mock<boolean, [unknown, unknown]>;
}

const createAccessor = (
  priority: number,
  appliesPredicate: (context: unknown, index: unknown) => boolean,
  value: unknown,
): IAccessorMock => {
  return {
    priority,
    getIndexes: () => [][Symbol.iterator](),
    hasValue: () => true,
    getResolvedValue: () => value,
    getValue: () => value,
    setValue: () => undefined,
    applies: jest.fn(appliesPredicate),
  };
};

describe('IndexValueAccessor', () => {
  it('reuses the last matching accessor for repeated lookups', () => {
    const highPriorityAccessor = createAccessor(
      10,
      (_context, index) => index === 'a',
      'A',
    );
    const lowPriorityAccessor = createAccessor(
      1,
      (_context, index) => index === 'b',
      'B',
    );

    const accessor = new IndexValueAccessor([
      highPriorityAccessor,
      lowPriorityAccessor,
    ]);
    const context = {};

    expect(accessor.getValue(context, 'b')).toBe('B');
    expect(accessor.getValue(context, 'b')).toBe('B');

    // First call checks high->low; second call should hit cached low accessor
    // directly and skip high accessor.
    expect(highPriorityAccessor.applies).toHaveBeenCalledTimes(1);
    expect(lowPriorityAccessor.applies).toHaveBeenCalledTimes(2);
  });

  it('does not reuse cache for a different index lookup', () => {
    const highPriorityAccessor = createAccessor(
      10,
      (_context, index) => index === 'a',
      'A',
    );
    const lowPriorityAccessor = createAccessor(
      1,
      (_context, index) => index === 'b',
      'B',
    );

    const accessor = new IndexValueAccessor([
      highPriorityAccessor,
      lowPriorityAccessor,
    ]);
    const context = {};

    expect(accessor.getValue(context, 'b')).toBe('B');
    expect(accessor.getValue(context, 'a')).toBe('A');

    expect(highPriorityAccessor.applies).toHaveBeenCalledTimes(2);
    expect(lowPriorityAccessor.applies).toHaveBeenCalledTimes(1);
  });

  it('does not reuse cache for a different context lookup', () => {
    const highPriorityAccessor = createAccessor(
      10,
      (_context, index) => index === 'a',
      'A',
    );
    const lowPriorityAccessor = createAccessor(
      1,
      (_context, index) => index === 'b',
      'B',
    );

    const accessor = new IndexValueAccessor([
      highPriorityAccessor,
      lowPriorityAccessor,
    ]);

    expect(accessor.getValue({}, 'b')).toBe('B');
    expect(accessor.getValue({}, 'b')).toBe('B');

    // Different object identity should force a fresh scan.
    expect(highPriorityAccessor.applies).toHaveBeenCalledTimes(2);
    expect(lowPriorityAccessor.applies).toHaveBeenCalledTimes(2);
  });
});
