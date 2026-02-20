export class ValueFormatter {
    public constructor(
        private readonly _maxDepth: number,
        private readonly _maxChars: number
    ) { }

    public format(value: unknown): string {
        const seen = new WeakSet<object>();


        const toJson = (v: unknown, depth: number): unknown => {
            if (depth > this._maxDepth) {
                return '[MaxDepth]';
            }

            if (v === null || v === undefined) {
                return null;
            }

            const t = typeof v;

            if (t === 'string' || t === 'number' || t === 'boolean') {
                return v;
            }

            if (t === 'bigint') {
                return v.toString();
            }

            if (t === 'symbol') {
                return v.toString();
            }

            if (t === 'function') {
                return `[Function ${(v as Function).name || 'anonymous'}]`;
            }

            if (v instanceof Date) {
                return v.toISOString();
            }

            if (v instanceof Error) {
                return { name: v.name, message: v.message, stack: v.stack };
            }

            if (Array.isArray(v)) {
                return v.map((x) => toJson(x, depth + 1));
            }

            if (t === 'object') {
                const obj = v as Record<string, unknown>;

                if (seen.has(obj)) {
                    return '[Circular]';
                }

                seen.add(obj);

                const out: Record<string, unknown> = {};
                const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));

                for (const k of keys) {
                    out[k] = toJson(obj[k], depth + 1);
                }

                return out;
            }

            return String(v);
        };

        let text = '';

        try {
            text = JSON.stringify(toJson(value, 0), null, 2) ?? 'null';
        } catch {
            text = String(value);
        }

        if (text.length > this._maxChars) {
            text = text.slice(0, this._maxChars) + '\n… [truncated]';
        }

        return text;
    }
}
