interface ICustomToString {
  toString(indent: number, level: number): string | string[];
}

interface IToLines {
  toLines(indent: number, level: number): string[];
}

type Handler<T> = {
  predicate: (value: unknown) => value is T;
  action: (value: T, level: number, quoteStrings?: boolean) => string[];
};

type AnyHandler = {
  predicate: (value: unknown) => boolean;
  action: (value: unknown, level: number, quoteStrings?: boolean) => string[];
};

/**
 * Seals a generic handler so it can live in a heterogeneous list.
 * This is the ONLY place where type erasure happens.
 */
function registerHandler<T>(handler: Handler<T>): AnyHandler {
  return {
    predicate: handler.predicate,
    action: (value, level, quoteStrings) =>
      handler.action(value as T, level, quoteStrings),
  };
}

export class PrettyPrinter {
  private readonly indent: number;
  private readonly handlers: AnyHandler[];
  constructor(indent: number = 4) {
    this.indent = indent;

    this.handlers = [
      registerHandler({
        predicate: (
          v,
        ): v is
          | string
          | number
          | boolean
          | bigint
          | symbol
          | null
          | undefined =>
          v === null ||
          [
            'string',
            'number',
            'boolean',
            'bigint',
            'symbol',
            'undefined',
          ].includes(typeof v),

        action: (v, level, quoteStrings) => [
          this.spaces(level) + this.formatPrimitive(v, quoteStrings ?? false),
        ],
      }),

      registerHandler({
        predicate: (v): v is Function => typeof v === 'function',
        action: (_, level) => [this.spaces(level) + '[[function]]'],
      }),

      registerHandler({
        predicate: Array.isArray,
        action: (v: unknown[], level, quoteStrings) => {
          if (v.length === 0) {
            return [this.spaces(level) + '[]'];
          }

          const lines: string[] = [this.spaces(level) + '['];
          for (let i = 0; i < v.length; i++) {
            const nested = this.toLines(v[i], level + 1, quoteStrings);
            lines.push(...nested);
            if (i < v.length - 1) {
              lines[lines.length - 1] += ',';
            }
          }
          lines.push(this.spaces(level) + ']');
          return lines;
        },
      }),

      registerHandler({
        predicate: (v): v is Map<unknown, unknown> => v instanceof Map,
        action: (v, level, quoteStrings) => {
          if (v.size === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          const next = this.spaces(level + 1);

          for (const [k, val] of v.entries()) {
            const nested = this.toLines(val, level + 1, quoteStrings);
            lines.push(`${next}${this.formatKey(k)}: ${nested[0].trimStart()}`);
            if (nested.length > 1) {
              lines.push(...nested.slice(1));
            }
          }

          lines.push(this.spaces(level) + '}');
          return lines;
        },
      }),

      registerHandler({
        predicate: (v): v is Set<unknown> => v instanceof Set,
        action: (v, level, quoteStrings) => {
          if (v.size === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          for (const item of v) {
            lines.push(...this.toLines(item, level + 1, quoteStrings));
          }
          lines.push(this.spaces(level) + '}');
          return lines;
        },
      }),

      registerHandler({
        predicate: (v): v is IToLines =>
          typeof v === 'object' && v !== null && 'toLines' in v,

        action: (v, _level) => v.toLines(this.indent, _level),
      }),

      registerHandler({
        predicate: (v): v is ICustomToString => this.isCustomToString(v),

        action: (v, level) => {
          const raw = v.toString(this.indent, level);
          const lines = Array.isArray(raw) ? raw : String(raw).split('\n');
          return lines.map((l) => this.spaces(level) + l);
        },
      }),

      registerHandler({
        predicate: (v): v is Record<string, unknown> =>
          typeof v === 'object' && v !== null && !Array.isArray(v),

        action: (v, level, quoteStrings) => {
          const keys = Object.keys(v);
          if (keys.length === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          const next = this.spaces(level + 1);

          for (const key of keys) {
            const nested = this.toLines(v[key], level + 1, quoteStrings);
            lines.push(`${next}${key}: ${nested[0].trimStart()}`);
            if (nested.length > 1) {
              lines.push(...nested.slice(1));
            }
          }

          lines.push(this.spaces(level) + '}');
          return lines;
        },
      }),
    ];
  }

  public toString(value: unknown, quoteStrings: boolean = true): string {
    return this.toLines(value, 0, quoteStrings).join('\n');
  }

  public toLines(
    value: unknown,
    level: number = 0,
    quoteStrings: boolean = true,
  ): string[] {
    for (const handler of this.handlers) {
      if (handler.predicate(value)) {
        return handler.action(value, level, quoteStrings);
      }
    }
    return [this.spaces(level) + String(value)];
  }

  private formatPrimitive(value: unknown, quoteStrings: boolean): string {
    if (typeof value === 'string' && quoteStrings) {
      return `'${value}'`;
    }
    return String(value);
  }

  private formatKey(key: unknown): string {
    return typeof key === 'string' ? key : String(key);
  }

  private spaces(level: number): string {
    return ' '.repeat(this.indent * level);
  }

  private isCustomToString(value: unknown): value is ICustomToString {
    if (typeof value !== 'object' || value === null) return false;
    const proto = Object.getPrototypeOf(value);
    if (!proto) return false;
    const desc = Object.getOwnPropertyDescriptor(proto, 'toString');
    return (
      !!desc &&
      typeof desc.value === 'function' &&
      desc.value !== Object.prototype.toString
    );
  }
}
