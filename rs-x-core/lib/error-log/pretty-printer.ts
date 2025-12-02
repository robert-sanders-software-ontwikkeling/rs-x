interface CustomToString {
    toString(indent: number, level: number): string | string[];
}

type Handler = {
    predicate: (value: unknown) => boolean;
    action: (value: unknown, level: number, quoteStrings: boolean) => string[];
};

export class PrettyPrinter {
    private readonly indent: number;
    private readonly handlers: Handler[];

    constructor(indent: number = 4) {
        this.indent = indent;

        this.handlers = [
            {
                predicate: (v) => v === null || ['string','number','boolean','bigint','symbol','undefined'].includes(typeof v),
                action: (v, level, quoteStrings) => [this.spaces(level) + this.formatPrimitive(v, quoteStrings)]
            },
            {
                predicate: (v) => typeof v === 'function',
                action: (_, level) => [this.spaces(level) + '[[method]]']
            },
            {
                predicate: Array.isArray,
                action: (v: unknown[], level, quoteStrings) => {
                    if (v.length === 0) return [this.spaces(level) + '[]'];
                    const lines: string[] = [this.spaces(level) + '['];
                    for (const item of v) {
                        const nested = this.toLines(item, level + 1, quoteStrings);
                        lines.push(...nested.map(l => l + ','));
                    }
                    lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
                    lines.push(this.spaces(level) + ']');
                    return lines;
                }
            },
            {
                predicate: (v) => v instanceof Map,
                action: (v: Map<unknown, unknown>, level, quoteStrings) => {
                    if (v.size === 0) return [this.spaces(level) + '{}'];
                    const lines: string[] = [this.spaces(level) + '{'];
                    const spacesNext = this.spaces(level + 1);
                    for (const [k, val] of v.entries()) {
                        const nested = this.toLines(val, level + 1, quoteStrings);
                        lines.push(`${spacesNext}${this.formatKey(k)}: ${nested[0].trimStart()}`);
                        if (nested.length > 1) lines.push(...nested.slice(1));
                    }
                    lines.push(this.spaces(level) + '}');
                    return lines;
                }
            },
            {
                predicate: (v) => v instanceof Set,
                action: (v: Set<unknown>, level, quoteStrings) => {
                    if (v.size === 0) return [this.spaces(level) + '{}'];
                    const lines: string[] = [this.spaces(level) + '{'];
                    for (const item of v) {
                        lines.push(...this.toLines(item, level + 1, quoteStrings));
                    }
                    lines.push(this.spaces(level) + '}');
                    return lines;
                }
            },
            {
                predicate: (v) => this.hasToLines(v),
                action: (v: any, level) => v.toLines(this.indent, level)
            },
            {
                predicate: (v) => this.isCustomToString(v),
                action: (v: any, level) => {
                    const raw = v.toString(this.indent, level);
                    return Array.isArray(raw) ? raw.map(l => this.spaces(level) + l)
                                               : String(raw).split('\n').map(l => this.spaces(level) + l);
                }
            },
            {
                predicate: (v) => this.isObject(v),
                action: (v: Record<string, unknown>, level, quoteStrings) => {
                    const keys = Object.keys(v);
                    if (keys.length === 0) return [this.spaces(level) + '{}'];
                    const lines: string[] = [this.spaces(level) + '{'];
                    const spacesNext = this.spaces(level + 1);
                    for (const key of keys) {
                        const nested = this.toLines(v[key], level + 1, quoteStrings);
                        lines.push(`${spacesNext}${key}: ${nested[0].trimStart()}`);
                        if (nested.length > 1) lines.push(...nested.slice(1));
                    }
                    lines.push(this.spaces(level) + '}');
                    return lines;
                }
            }
        ];
    }

    public toString(value: unknown, quoteStrings: boolean = true): string {
        return this.toLines(value, 0, quoteStrings).join('\n');
    }

    public toLines(value: unknown, level: number, quoteStrings: boolean = true): string[] {
        for (const handler of this.handlers) {
            if (handler.predicate(value)) {
                return handler.action(value, level, quoteStrings);
            }
        }
        return [this.spaces(level) + String(value)];
    }

    private formatPrimitive(value: unknown, quoteStrings: boolean): string {
        if (typeof value === 'string' && quoteStrings) return `'${value}'`;
        return String(value);
    }

    private formatKey(key: unknown): string {
        return typeof key === 'string' ? key : String(key);
    }

    private spaces(level: number): string {
        return ' '.repeat(this.indent * level);
    }

    private hasToLines(value: unknown): value is { toLines(indent: number, level: number): string[] } {
        return typeof value === 'object' && value !== null && typeof (value as any).toLines === 'function';
    }

    private isCustomToString(value: unknown): value is CustomToString {
        if (typeof value !== 'object' || value === null) return false;
        const proto = Object.getPrototypeOf(value);
        if (!proto) return false;
        const desc = Object.getOwnPropertyDescriptor(proto, 'toString');
        return !!desc && typeof desc.value === 'function' && desc.value !== Object.prototype.toString;
    }

    private isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Map) && !(value instanceof Set);
    }
}