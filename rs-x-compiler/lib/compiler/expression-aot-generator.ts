import type ts from 'typescript';

import {
  CompiledExpressionCompiler,
  type ICompiledExpressionPlan,
  type ICompiledExpressionWatchDependency,
  type ICompiledMemberChainPlan,
  type ICompiledMemberChainSegment,
  type ICompiledSequenceOperandPlan,
  JsExpressionAstParser,
} from '@rs-x/expression-parser';

import { detectExpressionSites } from './expression-site-detector';

export interface IGeneratedAotCompiledExpressionsModule {
  readonly code: string;
  readonly expressions: readonly string[];
  readonly skippedExpressions: readonly string[];
}

export interface IAotCompiledExpressionGenerationOptions {
  readonly includeResolvedEvaluator?: boolean;
}

export interface IGeneratedAotParsedExpressionCacheModule {
  readonly code: string;
  readonly expressions: readonly string[];
  readonly skippedExpressions: readonly string[];
}

export interface IGeneratedAotLazyExpressionPreloadManifestModule {
  readonly code: string;
  readonly expressions: readonly string[];
}

export interface IGeneratedAotLazyExpressionsModule {
  readonly code: string;
  readonly expressions: readonly string[];
  readonly compiledExpressions: readonly string[];
  readonly skippedCompiledExpressions: readonly string[];
  readonly skippedPreparsedExpressions: readonly string[];
}

export function generateAotCompiledExpressionsModule(
  program: ts.Program,
  options: IAotCompiledExpressionGenerationOptions = {},
): IGeneratedAotCompiledExpressionsModule {
  const includeResolvedEvaluator = options.includeResolvedEvaluator === true;
  const detections = detectExpressionSites(program);
  const uniqueExpressions = [
    ...new Set(
      detections
        .filter(
          (detection) =>
            detection.preparse && !detection.lazy && detection.compiled,
        )
        .map((detection) => detection.expression),
    ),
  ];
  uniqueExpressions.sort();

  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  const compiledPlans: Array<{
    expression: string;
    plan: ICompiledExpressionPlan;
  }> = [];
  const skippedExpressions: string[] = [];

  for (let i = 0; i < uniqueExpressions.length; i++) {
    const expression = uniqueExpressions[i];
    const plan = compiler.tryCompile(expression);
    if (!plan) {
      skippedExpressions.push(expression);
      continue;
    }
    compiledPlans.push({ expression, plan });
  }

  const compactEntries = compiledPlans
    .map(({ plan }) =>
      serializeCompactPlanEntry(plan, {
        includeResolvedEvaluator,
      }),
    )
    .join(',\n');

  const code = [
    "import { registerCompiledExpressionPlansInExpressionCache } from '@rs-x/expression-parser';",
    '',
    'const compactPlans = [',
    compactEntries,
    '];',
    '',
    'function deserializeMemberChain(memberChain) {',
    '  if (!memberChain) return undefined;',
    '  const segments = new Array(memberChain[1].length);',
    '  for (let i = 0; i < memberChain[1].length; i += 1) {',
    '    const segment = memberChain[1][i];',
    '    if (segment[0] === "s") {',
    '      segments[i] = { kind: "static", key: segment[1] };',
    '      continue;',
    '    }',
    '    segments[i] = {',
    '      kind: "computed",',
    '      key: undefined,',
    '      expressionString: segment[1],',
    '      dependencyNames: segment[2],',
    '      evaluateIndex: segment[3],',
    '      evaluateIndexByOwnDependencies: segment[4],',
    '    };',
    '  }',
    '  return { rootIdentifier: memberChain[0], segments };',
    '}',
    '',
    'function deserializeSequenceOperands(sequenceOperands) {',
    '  if (!sequenceOperands) return undefined;',
    '  const operands = new Array(sequenceOperands.length);',
    '  for (let i = 0; i < sequenceOperands.length; i += 1) {',
    '    const operand = sequenceOperands[i];',
    '    operands[i] = {',
    '      expressionString: operand[0],',
    '      dependencyNames: operand[1],',
    '      evaluate: operand[2],',
    '    };',
    '  }',
    '  return operands;',
    '}',
    '',
    'function expandCompiledPlans(compact, includeResolvedEvaluator) {',
    '  const expanded = {};',
    '  for (let i = 0; i < compact.length; i += 1) {',
    '    const entry = compact[i];',
    '    const expressionString = entry[0];',
    '    const watchDependenciesCompact = entry[2];',
    '    const watchDependencies = new Array(watchDependenciesCompact.length);',
    '    for (let j = 0; j < watchDependenciesCompact.length; j += 1) {',
    '      const watchDependency = watchDependenciesCompact[j];',
    '      watchDependencies[j] = {',
    '        name: watchDependency[0],',
    '        ownerPath: watchDependency[1],',
    '        isLeaf: watchDependency[2],',
    '        isMemberExpressionSegment: watchDependency[3],',
    '      };',
    '    }',
    '    const expandedPlan = {',
    '      expressionString,',
    '      dependencyNames: entry[1],',
    '      watchDependencies,',
    '      expressionType: entry[3],',
    '      hasHiddenArgumentArray: entry[4],',
    '      memberChain: deserializeMemberChain(entry[5]),',
    '      sequenceOperands: deserializeSequenceOperands(entry[6]),',
    '      evaluate: entry[7],',
    '    };',
    '    if (includeResolvedEvaluator && entry[8]) {',
    '      expandedPlan.evaluateResolvedDependencies = entry[8];',
    '    }',
    '    expanded[expressionString] = expandedPlan;',
    '  }',
    '  return expanded;',
    '}',
    '',
    'export function registerRsxAotCompiledExpressions(): void {',
    `  registerCompiledExpressionPlansInExpressionCache(expandCompiledPlans(compactPlans, ${String(
      includeResolvedEvaluator,
    )}));`,
    '}',
    '',
  ].join('\n');

  return {
    code,
    expressions: compiledPlans.map((item) => item.expression),
    skippedExpressions,
  };
}

export function generateAotParsedExpressionCacheModule(
  program: ts.Program,
): IGeneratedAotParsedExpressionCacheModule {
  const detections = detectExpressionSites(program);
  const uniqueExpressions = [
    ...new Set(
      detections
        .filter((detection) => detection.preparse && !detection.lazy)
        .map((detection) => detection.expression),
    ),
  ];
  uniqueExpressions.sort();

  const parser = new JsExpressionAstParser();
  const parsedExpressions: Array<{
    expression: string;
    expressionAst: unknown;
  }> = [];
  const skippedExpressions: string[] = [];

  for (let i = 0; i < uniqueExpressions.length; i++) {
    const expression = uniqueExpressions[i];
    try {
      const expressionAst = parser.parse(expression);
      parsedExpressions.push({ expression, expressionAst });
    } catch {
      skippedExpressions.push(expression);
    }
  }

  const astObject = parsedExpressions
    .map(
      ({ expression, expressionAst }) =>
        `${JSON.stringify(expression)}: ${JSON.stringify(expressionAst)}`,
    )
    .join(',\n');

  const code = [
    'import {',
    '  registerPreparsedExpressionAsts,',
    "} from '@rs-x/expression-parser';",
    '',
    'const preparsedExpressionAsts: Record<string, unknown> = {',
    astObject,
    '};',
    '',
    'export function registerRsxAotParsedExpressionCache(): void {',
    '  registerPreparsedExpressionAsts(preparsedExpressionAsts as any);',
    '}',
    '',
  ].join('\n');

  return {
    code,
    expressions: parsedExpressions.map((item) => item.expression),
    skippedExpressions,
  };
}

export function generateAotLazyExpressionPreloadManifestModule(
  program: ts.Program,
  options: IAotCompiledExpressionGenerationOptions = {},
): IGeneratedAotLazyExpressionPreloadManifestModule {
  const includeResolvedEvaluator = options.includeResolvedEvaluator === true;
  const detections = detectExpressionSites(program);
  const lazyPreparsedExpressions = [
    ...new Set(
      detections
        .filter((detection) => detection.preparse && detection.lazy)
        .map((detection) => detection.expression),
    ),
  ];
  lazyPreparsedExpressions.sort();

  const lazyCompiledExpressions = [
    ...new Set(
      detections
        .filter(
          (detection) =>
            detection.preparse && detection.lazy && detection.compiled,
        )
        .map((detection) => detection.expression),
    ),
  ];
  lazyCompiledExpressions.sort();

  const parser = new JsExpressionAstParser();
  const parsedExpressions: Array<{
    expression: string;
    expressionAst: unknown;
  }> = [];
  for (let i = 0; i < lazyPreparsedExpressions.length; i += 1) {
    const expression = lazyPreparsedExpressions[i];
    try {
      parsedExpressions.push({
        expression,
        expressionAst: parser.parse(expression),
      });
    } catch {
      // Skip invalid expressions here; semantic validation covers them elsewhere.
    }
  }

  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  const compiledPlans: Array<{
    expression: string;
    plan: ICompiledExpressionPlan;
  }> = [];
  for (let i = 0; i < lazyCompiledExpressions.length; i += 1) {
    const expression = lazyCompiledExpressions[i];
    const plan = compiler.tryCompile(expression);
    if (!plan) {
      continue;
    }
    compiledPlans.push({ expression, plan });
  }

  const astObject = parsedExpressions
    .map(
      ({ expression, expressionAst }) =>
        `${JSON.stringify(expression)}: ${JSON.stringify(expressionAst)}`,
    )
    .join(',\n');
  const compactEntries = compiledPlans
    .map(({ plan }) =>
      serializeCompactPlanEntry(plan, {
        includeResolvedEvaluator,
      }),
    )
    .join(',\n');

  const code = [
    'import {',
    '  registerCompiledExpressionPlanInExpressionCache,',
    '  registerLazyExpressionPreloader,',
    '  registerPreparsedExpressionAst,',
    "} from '@rs-x/expression-parser';",
    '',
    'const preparsedExpressionAsts: Record<string, unknown> = {',
    astObject,
    '};',
    '',
    'const compactPlans = [',
    compactEntries,
    '];',
    '',
    'function deserializeMemberChain(memberChain) {',
    '  if (!memberChain) return undefined;',
    '  const segments = new Array(memberChain[1].length);',
    '  for (let i = 0; i < memberChain[1].length; i += 1) {',
    '    const segment = memberChain[1][i];',
    '    if (segment[0] === "s") {',
    '      segments[i] = { kind: "static", key: segment[1] };',
    '      continue;',
    '    }',
    '    segments[i] = {',
    '      kind: "computed",',
    '      key: undefined,',
    '      expressionString: segment[1],',
    '      dependencyNames: segment[2],',
    '      evaluateIndex: segment[3],',
    '      evaluateIndexByOwnDependencies: segment[4],',
    '    };',
    '  }',
    '  return { rootIdentifier: memberChain[0], segments };',
    '}',
    '',
    'function deserializeSequenceOperands(sequenceOperands) {',
    '  if (!sequenceOperands) return undefined;',
    '  const operands = new Array(sequenceOperands.length);',
    '  for (let i = 0; i < sequenceOperands.length; i += 1) {',
    '    const operand = sequenceOperands[i];',
    '    operands[i] = {',
    '      expressionString: operand[0],',
    '      dependencyNames: operand[1],',
    '      evaluate: operand[2],',
    '    };',
    '  }',
    '  return operands;',
    '}',
    '',
    'function expandCompiledPlans(compact, includeResolvedEvaluator) {',
    '  const expanded = {};',
    '  for (let i = 0; i < compact.length; i += 1) {',
    '    const entry = compact[i];',
    '    const expressionString = entry[0];',
    '    const watchDependenciesCompact = entry[2];',
    '    const watchDependencies = new Array(watchDependenciesCompact.length);',
    '    for (let j = 0; j < watchDependenciesCompact.length; j += 1) {',
    '      const watchDependency = watchDependenciesCompact[j];',
    '      watchDependencies[j] = {',
    '        name: watchDependency[0],',
    '        ownerPath: watchDependency[1],',
    '        isLeaf: watchDependency[2],',
    '        isMemberExpressionSegment: watchDependency[3],',
    '      };',
    '    }',
    '    const expandedPlan = {',
    '      expressionString,',
    '      dependencyNames: entry[1],',
    '      watchDependencies,',
    '      expressionType: entry[3],',
    '      hasHiddenArgumentArray: entry[4],',
    '      memberChain: deserializeMemberChain(entry[5]),',
    '      sequenceOperands: deserializeSequenceOperands(entry[6]),',
    '      evaluate: entry[7],',
    '    };',
    '    if (includeResolvedEvaluator && entry[8]) {',
    '      expandedPlan.evaluateResolvedDependencies = entry[8];',
    '    }',
    '    expanded[expressionString] = expandedPlan;',
    '  }',
    '  return expanded;',
    '}',
    '',
    `const compiledPlansByExpression = expandCompiledPlans(compactPlans, ${String(
      includeResolvedEvaluator,
    )});`,
    `export const rsxAotLazyExpressionManifest: Record<string, true> = {${
      parsedExpressions.length || compiledPlans.length
        ? `\n${[
            ...new Set([
              ...parsedExpressions.map((entry) => entry.expression),
              ...compiledPlans.map((entry) => entry.expression),
            ]),
          ]
            .sort()
            .map((expression) => `${JSON.stringify(expression)}: true`)
            .join(',\n')}\n`
        : ''
    }};`,
    '',
    'export function registerRsxAotLazyExpressionPreloaders(): void {',
    '  for (const expressionString of Object.keys(rsxAotLazyExpressionManifest)) {',
    '    registerLazyExpressionPreloader(expressionString, () => {',
    '      const expressionAst = preparsedExpressionAsts[expressionString];',
    '      if (expressionAst) {',
    '        registerPreparsedExpressionAst(expressionString, expressionAst as any);',
    '      }',
    '      const compiledPlan = compiledPlansByExpression[expressionString];',
    '      if (compiledPlan) {',
    '        registerCompiledExpressionPlanInExpressionCache(expressionString, compiledPlan);',
    '      }',
    '    });',
    '  }',
    '}',
    '',
  ].join('\n');

  return {
    code,
    expressions: [
      ...new Set([
        ...parsedExpressions.map((item) => item.expression),
        ...compiledPlans.map((item) => item.expression),
      ]),
    ].sort(),
  };
}

export function generateAotLazyExpressionsModule(
  program: ts.Program,
  options: IAotCompiledExpressionGenerationOptions = {},
): IGeneratedAotLazyExpressionsModule {
  const includeResolvedEvaluator = options.includeResolvedEvaluator === true;
  const detections = detectExpressionSites(program);
  const lazyPreparsedExpressions = [
    ...new Set(
      detections
        .filter((detection) => detection.preparse && detection.lazy)
        .map((detection) => detection.expression),
    ),
  ];
  lazyPreparsedExpressions.sort();

  const lazyCompiledExpressions = [
    ...new Set(
      detections
        .filter(
          (detection) =>
            detection.preparse && detection.lazy && detection.compiled,
        )
        .map((detection) => detection.expression),
    ),
  ];
  lazyCompiledExpressions.sort();

  const parser = new JsExpressionAstParser();
  const parsedExpressions: Array<{
    expression: string;
    expressionAst: unknown;
  }> = [];
  const skippedPreparsedExpressions: string[] = [];

  for (let i = 0; i < lazyPreparsedExpressions.length; i += 1) {
    const expression = lazyPreparsedExpressions[i];
    try {
      const expressionAst = parser.parse(expression);
      parsedExpressions.push({ expression, expressionAst });
    } catch {
      skippedPreparsedExpressions.push(expression);
    }
  }

  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  const compiledPlans: Array<{
    expression: string;
    plan: ICompiledExpressionPlan;
  }> = [];
  const skippedCompiledExpressions: string[] = [];

  for (let i = 0; i < lazyCompiledExpressions.length; i += 1) {
    const expression = lazyCompiledExpressions[i];
    const plan = compiler.tryCompile(expression);
    if (!plan) {
      skippedCompiledExpressions.push(expression);
      continue;
    }
    compiledPlans.push({ expression, plan });
  }

  const astObject = parsedExpressions
    .map(
      ({ expression, expressionAst }) =>
        `${JSON.stringify(expression)}: ${JSON.stringify(expressionAst)}`,
    )
    .join(',\n');
  const compactEntries = compiledPlans
    .map(({ plan }) =>
      serializeCompactPlanEntry(plan, {
        includeResolvedEvaluator,
      }),
    )
    .join(',\n');

  const code = [
    'import {',
    '  registerCompiledExpressionPlansInExpressionCache,',
    '  registerPreparsedExpressionAsts,',
    "} from '@rs-x/expression-parser';",
    '',
    'const preparsedExpressionAsts: Record<string, unknown> = {',
    astObject,
    '};',
    '',
    'const compactPlans = [',
    compactEntries,
    '];',
    '',
    'function deserializeMemberChain(memberChain) {',
    '  if (!memberChain) return undefined;',
    '  const segments = new Array(memberChain[1].length);',
    '  for (let i = 0; i < memberChain[1].length; i += 1) {',
    '    const segment = memberChain[1][i];',
    '    if (segment[0] === "s") {',
    '      segments[i] = { kind: "static", key: segment[1] };',
    '      continue;',
    '    }',
    '    segments[i] = {',
    '      kind: "computed",',
    '      key: undefined,',
    '      expressionString: segment[1],',
    '      dependencyNames: segment[2],',
    '      evaluateIndex: segment[3],',
    '      evaluateIndexByOwnDependencies: segment[4],',
    '    };',
    '  }',
    '  return { rootIdentifier: memberChain[0], segments };',
    '}',
    '',
    'function deserializeSequenceOperands(sequenceOperands) {',
    '  if (!sequenceOperands) return undefined;',
    '  const operands = new Array(sequenceOperands.length);',
    '  for (let i = 0; i < sequenceOperands.length; i += 1) {',
    '    const operand = sequenceOperands[i];',
    '    operands[i] = {',
    '      expressionString: operand[0],',
    '      dependencyNames: operand[1],',
    '      evaluate: operand[2],',
    '    };',
    '  }',
    '  return operands;',
    '}',
    '',
    'function expandCompiledPlans(compact, includeResolvedEvaluator) {',
    '  const expanded = {};',
    '  for (let i = 0; i < compact.length; i += 1) {',
    '    const entry = compact[i];',
    '    const expressionString = entry[0];',
    '    const watchDependenciesCompact = entry[2];',
    '    const watchDependencies = new Array(watchDependenciesCompact.length);',
    '    for (let j = 0; j < watchDependenciesCompact.length; j += 1) {',
    '      const watchDependency = watchDependenciesCompact[j];',
    '      watchDependencies[j] = {',
    '        name: watchDependency[0],',
    '        ownerPath: watchDependency[1],',
    '        isLeaf: watchDependency[2],',
    '        isMemberExpressionSegment: watchDependency[3],',
    '      };',
    '    }',
    '    const expandedPlan = {',
    '      expressionString,',
    '      dependencyNames: entry[1],',
    '      watchDependencies,',
    '      expressionType: entry[3],',
    '      hasHiddenArgumentArray: entry[4],',
    '      memberChain: deserializeMemberChain(entry[5]),',
    '      sequenceOperands: deserializeSequenceOperands(entry[6]),',
    '      evaluate: entry[7],',
    '    };',
    '    if (includeResolvedEvaluator && entry[8]) {',
    '      expandedPlan.evaluateResolvedDependencies = entry[8];',
    '    }',
    '    expanded[expressionString] = expandedPlan;',
    '  }',
    '  return expanded;',
    '}',
    '',
    'let hasRegisteredRsxAotLazyExpressions = false;',
    '',
    'export function registerRsxAotLazyExpressions(): void {',
    '  if (hasRegisteredRsxAotLazyExpressions) {',
    '    return;',
    '  }',
    '  hasRegisteredRsxAotLazyExpressions = true;',
    '  registerPreparsedExpressionAsts(preparsedExpressionAsts as any);',
    `  registerCompiledExpressionPlansInExpressionCache(expandCompiledPlans(compactPlans, ${String(
      includeResolvedEvaluator,
    )}));`,
    '}',
    '',
  ].join('\n');

  return {
    code,
    expressions: parsedExpressions.map((item) => item.expression),
    compiledExpressions: compiledPlans.map((item) => item.expression),
    skippedCompiledExpressions,
    skippedPreparsedExpressions,
  };
}

function serializeCompactPlanEntry(
  plan: ICompiledExpressionPlan,
  options: IAotCompiledExpressionGenerationOptions,
): string {
  return `[${[
    JSON.stringify(plan.expressionString),
    serializeStringArray(plan.dependencyNames),
    serializeCompactWatchDependencies(plan.watchDependencies),
    JSON.stringify(plan.expressionType),
    String(plan.hasHiddenArgumentArray),
    serializeCompactMemberChain(plan.memberChain),
    serializeCompactSequenceOperands(plan.sequenceOperands),
    serializeFunction(plan.evaluate),
    options.includeResolvedEvaluator && plan.evaluateResolvedDependencies
      ? serializeFunction(plan.evaluateResolvedDependencies)
      : 'undefined',
  ].join(',')}]`;
}

function serializeCompactWatchDependencies(
  dependencies: readonly ICompiledExpressionWatchDependency[],
): string {
  return `[${dependencies
    .map(
      (dependency) =>
        `[${JSON.stringify(dependency.name)},${serializeStringArray(dependency.ownerPath)},${String(dependency.isLeaf)},${String(dependency.isMemberExpressionSegment)}]`,
    )
    .join(',')}]`;
}

function serializeCompactMemberChain(
  plan: ICompiledMemberChainPlan | undefined,
): string {
  if (!plan) {
    return 'null';
  }

  return `[${JSON.stringify(plan.rootIdentifier)},[${plan.segments
    .map((segment) => serializeCompactMemberSegment(segment))
    .join(',')}]]`;
}

function serializeCompactMemberSegment(
  segment: ICompiledMemberChainSegment,
): string {
  if (segment.kind === 'static') {
    return `["s",${JSON.stringify(segment.key)}]`;
  }

  return `["c",${JSON.stringify(segment.expressionString)},${serializeStringArray(segment.dependencyNames ?? [])},${
    segment.evaluateIndex
      ? serializeFunction(segment.evaluateIndex)
      : 'undefined'
  },${
    segment.evaluateIndexByOwnDependencies
      ? serializeFunction(segment.evaluateIndexByOwnDependencies)
      : 'undefined'
  }]`;
}

function serializeCompactSequenceOperands(
  operands: readonly ICompiledSequenceOperandPlan[] | undefined,
): string {
  if (!operands || operands.length === 0) {
    return 'null';
  }

  return `[${operands
    .map(
      (operand) =>
        `[${JSON.stringify(operand.expressionString)},${serializeStringArray(operand.dependencyNames)},${serializeFunction(operand.evaluate)}]`,
    )
    .join(',')}]`;
}

function serializeStringArray(values: readonly string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(',')}]`;
}

function serializeFunction(fn: (...args: unknown[]) => unknown): string {
  return `(${fn.toString()})`;
}
