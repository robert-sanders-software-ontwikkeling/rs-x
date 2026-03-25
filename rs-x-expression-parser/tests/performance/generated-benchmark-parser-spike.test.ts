import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';

type IParserEntry = {
  readonly name: string;
  readonly parse: (expression: string) => unknown;
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function runParseBenchmark(
  name: string,
  expressions: readonly string[],
  parse: (expression: string) => unknown,
): { name: string; totalMs: number } {
  const startMs = performance.now();
  for (let i = 0; i < expressions.length; i += 1) {
    parse(expressions[i]);
  }
  return {
    name,
    totalMs: performance.now() - startMs,
  };
}

describe('Generated benchmark parser spike', () => {
  it('compares parser-only throughput for espree vs optional alternatives', async () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const expressions = generatedBenchmarkExpressionStrings.slice(0, maxCount);
    expect(expressions.length).toBeGreaterThan(0);

    const parsers: IParserEntry[] = [];
    const requireFromHere = createRequire(__filename);

    const meriyah = requireFromHere('meriyah') as {
      parseScript: (code: string, options: Record<string, unknown>) => unknown;
    };
    parsers.push({
      name: 'meriyah',
      parse: (expression: string) =>
        meriyah.parseScript(expression, {
          next: true,
          ranges: true,
        }),
    });

    try {
      const espree = requireFromHere('espree') as {
        parse: (code: string, options: Record<string, unknown>) => unknown;
      };
      parsers.push({
        name: 'espree',
        parse: (expression: string) =>
          espree.parse(expression, {
            ecmaVersion: 2022,
            range: true,
          }),
      });
    } catch {
      // Optional dependency in this spike test.
    }

    try {
      const acorn = requireFromHere('acorn') as {
        parse: (code: string, options: Record<string, unknown>) => unknown;
      };
      parsers.push({
        name: 'acorn',
        parse: (expression: string) =>
          acorn.parse(expression, {
            ecmaVersion: 2022,
            ranges: true,
          }),
      });
    } catch {
      // Optional dependency in this spike test.
    }

    const results = parsers.map((parser) =>
      runParseBenchmark(parser.name, expressions, parser.parse),
    );
    expect(results.length).toBeGreaterThan(0);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      const summary = results
        .map(
          (result) =>
            `${result.name}=${Number(result.totalMs.toFixed(2))}ms`,
        )
        .join(' ');
      console.log(`[parser-spike] count=${expressions.length} ${summary}`);
    }

    // Keep a minimal correctness assertion so this benchmark remains stable.
    expect(results.find((result) => result.name === 'meriyah')?.totalMs).toBeGreaterThan(0);
  });
});
