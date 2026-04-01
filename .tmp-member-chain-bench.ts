import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';
import { CompiledExpressionCompiler } from './rs-x-expression-parser/lib/compiled-expression/compiled-expression.compiler';

const expr = 'a.b.c.d';
const count = 200000;

const warmup = (compiler: any) => {
  for (let i = 0; i < 1000; i++) compiler.tryCompile(expr);
};

const bench = (compiler: any) => {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < count; i++) {
    const plan = compiler.tryCompile(expr);
    if (!plan) throw new Error('plan missing');
  }
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6;
};

(async () => {
  await InjectionContainer.load(RsXExpressionParserModule);
  const parser = InjectionContainer.get('IJsExpressionAstParser');
  const compilerOptimized = new CompiledExpressionCompiler(parser);

  warmup(compilerOptimized);
  if (typeof global.gc === 'function') global.gc();
  const fastMs = bench(compilerOptimized);

  const compilerFallback = new CompiledExpressionCompiler(parser);
  (compilerFallback as any).tryBuildSimpleMemberChainPlan = () => undefined;

  warmup(compilerFallback);
  if (typeof global.gc === 'function') global.gc();
  const slowMs = bench(compilerFallback);

  console.log('count', count);
  console.log('fastPath', fastMs.toFixed(2), 'ms');
  console.log('noFastPath', slowMs.toFixed(2), 'ms');
  console.log('ratio', (slowMs / fastMs).toFixed(3));
  console.log('delta ms', (slowMs - fastMs).toFixed(2));
  console.log('pct gain', (((slowMs - fastMs) / slowMs) * 100).toFixed(2) + '%');
  process.exit(0);
})();