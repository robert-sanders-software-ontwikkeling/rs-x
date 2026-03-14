interface ICustomToString {
  toString(indent: number, level: number): string | string[];
}

interface IToLines {
  toLines(indent: number, level: number): string[];
}

export interface IPrettyPrinterOptions {
  maxDepth?: number;
  maxChars?: number;
  sortObjectKeys?: boolean;
}

interface IPrettyPrinterContext {
  quoteStrings: boolean;
  maxDepth?: number;
  sortObjectKeys: boolean;
  seen: WeakSet<object>;
}

type Handler<T> = {
  predicate: (value: unknown) => value is T;
  action: (
    value: T,
    level: number,
    depth: number,
    context: IPrettyPrinterContext,
  ) => string[];
};

type AnyHandler = {
  predicate: (value: unknown) => boolean;
  action: (
    value: unknown,
    level: number,
    depth: number,
    context: IPrettyPrinterContext,
  ) => string[];
};

/**
 * Seals a generic handler so it can live in a heterogeneous list.
 * This is the ONLY place where type erasure happens.
 */
function registerHandler<T>(handler: Handler<T>): AnyHandler {
  return {
    predicate: handler.predicate,
    action: (value, level, depth, context) =>
      handler.action(value as T, level, depth, context),
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

        action: (v, level, _depth, context) => [
          this.spaces(level) + this.formatPrimitive(v, context.quoteStrings),
        ],
      }),

      registerHandler({
        predicate: (v): v is Function => typeof v === 'function',
        action: (_, level) => [this.spaces(level) + '[[function]]'],
      }),

      registerHandler({
        predicate: (v): v is Date => v instanceof Date,
        action: (v, level) => [this.spaces(level) + this.formatDate(v)],
      }),

      registerHandler({
        predicate: (v): v is Error => v instanceof Error,
        action: (v, level) => [this.spaces(level) + this.formatError(v)],
      }),

      registerHandler({
        predicate: Array.isArray,
        action: (v: unknown[], level, depth, context) => {
          if (v.length === 0) {
            return [this.spaces(level) + '[]'];
          }

          const lines: string[] = [this.spaces(level) + '['];
          for (let i = 0; i < v.length; i++) {
            const nested = this.toLinesInternal(
              v[i],
              level + 1,
              depth + 1,
              context,
            );
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
        action: (v, level, depth, context) => {
          if (v.size === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          const next = this.spaces(level + 1);

          for (const [k, val] of v.entries()) {
            const nested = this.toLinesInternal(
              val,
              level + 1,
              depth + 1,
              context,
            );
            lines.push(
              `${next}${this.formatKey(k)}: ${nested[0].trimStart()}`,
            );
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
        action: (v, level, depth, context) => {
          if (v.size === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          for (const item of v) {
            lines.push(
              ...this.toLinesInternal(item, level + 1, depth + 1, context),
            );
          }
          lines.push(this.spaces(level) + '}');
          return lines;
        },
      }),

      registerHandler({
        predicate: (v): v is IToLines =>
          typeof v === 'object' && v !== null && 'toLines' in v,

        action: (v, level) => v.toLines(this.indent, level),
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

        action: (v, level, depth, context) => {
          const keys = Object.keys(v);
          if (context.sortObjectKeys) {
            keys.sort((a, b) => a.localeCompare(b));
          }

          if (keys.length === 0) {
            return [this.spaces(level) + '{}'];
          }

          const lines: string[] = [this.spaces(level) + '{'];
          const next = this.spaces(level + 1);

          for (const key of keys) {
            const nested = this.toLinesInternal(
              v[key],
              level + 1,
              depth + 1,
              context,
            );
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

  public toString(
    value: unknown,
    quoteStrings: boolean = true,
    options?: IPrettyPrinterOptions,
  ): string {
    const lines = this.toLines(value, 0, quoteStrings, options);
    const text = lines.join('\n');
    return this.truncate(text, options?.maxChars);
  }

  public toLines(
    value: unknown,
    level: number = 0,
    quoteStrings: boolean = true,
    options?: IPrettyPrinterOptions,
  ): string[] {
    const context: IPrettyPrinterContext = {
      quoteStrings,
      maxDepth: options?.maxDepth,
      sortObjectKeys: options?.sortObjectKeys ?? false,
      seen: new WeakSet<object>(),
    };

    return this.toLinesInternal(value, level, 0, context);
  }

  private toLinesInternal(
    value: unknown,
    level: number,
    depth: number,
    context: IPrettyPrinterContext,
  ): string[] {
    if (this.isMaxDepthReached(context.maxDepth, depth)) {
      return [this.spaces(level) + '[MaxDepth]'];
    }

    if (this.isCircular(value, context.seen)) {
      return [this.spaces(level) + '[Circular]'];
    }

    for (const handler of this.handlers) {
      if (handler.predicate(value)) {
        return handler.action(value, level, depth, context);
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

  private formatDate(value: Date): string {
    const timestamp = value.getTime();
    if (Number.isNaN(timestamp)) {
      return String(value);
    }

    return value.toISOString();
  }

  private formatError(value: Error): string {
    const name = value.name || 'Error';
    const message = value.message?.trim();
    return message ? `${name}: ${message}` : name;
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

  private isMaxDepthReached(maxDepth: number | undefined, depth: number): boolean {
    return maxDepth !== undefined && depth > maxDepth;
  }

  private isCircular(value: unknown, seen: WeakSet<object>): boolean {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    if (seen.has(value)) {
      return true;
    }

    seen.add(value);
    return false;
  }

  private truncate(text: string, maxChars: number | undefined): string {
    if (maxChars === undefined || maxChars < 0 || text.length <= maxChars) {
      return text;
    }

    return `${text.slice(0, maxChars)}\n… [truncated]`;
  }
}
