import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserInjectionTokens, RsXExpressionParserModule, rsx } from '@rs-x/expression-parser';
import { RsXStateManagerInjectionTokens } from '@rs-x/state-manager';

await InjectionContainer.load(RsXExpressionParserModule);
const stateManager = InjectionContainer.get(RsXStateManagerInjectionTokens.IStateManager);

const count = 5000;
const rowModels = Array.from({ length: count }, (_, i) => ({ a: i, b: i * 2 }));

const waitForExpressionsInitialized = async (expressions, maxPolls = 50) => {
  let polls = 0;
  while (expressions.some((expression) => expression.value === undefined)) {
    await Promise.resolve();
    polls += 1;
    if (polls >= maxPolls) {
      const uninit = expressions.filter(e => e.value === undefined).length;
      throw new Error(`Timed out. ${uninit} of ${expressions.length} still uninitialized. Sample values: ${expressions.slice(0,5).map(e => e.value)}`);
    }
  }
  return polls;
};

console.log('Starting bind test with', count, 'bindings...');
const before = process.memoryUsage().heapUsed;
const expressions = rowModels.map((row) => rsx('a + b')(row));
const afterBind = process.memoryUsage().heapUsed;
console.log(`Bound, heap delta: ${Math.round((afterBind - before)/1024)}KB`);

try {
  const polls = await waitForExpressionsInitialized(expressions);
  console.log(`Initialized after ${polls} polls! Sample values: [0]=${expressions[0].value}, [2499]=${expressions[2499].value}, [4999]=${expressions[4999].value}`);
} catch(e) {
  console.error('ERROR:', e.message);
}

for (const e of expressions) e.dispose();
stateManager.clear();
