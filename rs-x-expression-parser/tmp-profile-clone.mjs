import { Session } from 'node:inspector/promises';
import fs from 'node:fs/promises';
import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

const container = new InjectionContainer();
container.register(RsXExpressionParserModule);
const factory = container.resolve(
  RsXExpressionParserInjectionTokens.ExpressionServicesFactory,
);
const services = factory.create({});
const parser = services.parser;

const terms = Array.from({ length: 32 }, (_, i) => 'v' + i);
const exprStr = terms.join(' + ');
const template = parser.parse(exprStr);

// Warm up JIT
for (let i = 0; i < 2000; i++) template.clone();

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.setSamplingInterval', { interval: 100 });
await session.post('Profiler.start');

for (let i = 0; i < 100000; i++) template.clone();

const { profile } = await session.post('Profiler.stop');
await fs.writeFile('tmp-clone.cpuprofile', JSON.stringify(profile));
console.log('Done. Top hit counts by function:');

const nodes = profile.nodes;
const selfMap = new Map();
for (const node of nodes) {
  const fn = node.callFrame;
  const key = `${fn.functionName || '(anonymous)'} @ ${fn.url}:${fn.lineNumber}`;
  selfMap.set(key, (selfMap.get(key) || 0) + (node.hitCount || 0));
}
const sorted = [...selfMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [name, hits] of sorted) {
  if (hits > 0) console.log(`  ${hits.toString().padStart(6)} ${name}`);
}
