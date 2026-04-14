import type {
  ICompiledExpressionPlan,
  ICompiledExpressionWatchDependency,
  ICompiledMemberChainPlan,
  ICompiledMemberChainSegment,
  ICompiledSequenceOperandPlan,
} from '../compiled-expression/compiled-expression.compiler.interface';

export {
  registerCompiledExpressionPlanInExpressionCache,
  registerCompiledExpressionPlansInExpressionCache,
} from '../compiled-expression/compiled-expression-cache-preload';
export {
  clearLazyExpressionPreloaders,
  getLazyExpressionGroup,
  hasLazyExpressionPreloader,
  hasLazyGroupPreloader,
  registerLazyExpressionGroupPreloader,
  registerLazyExpressionInGroup,
  registerLazyExpressionPreloader,
  registerLazyExpressionPreloaders,
  startLazyExpressionPreload,
  startLazyGroupPreload,
  triggerLazyExpressionPreload,
} from '../expression-cache/lazy-expression-preload-registry';
export {
  clearPreparsedExpressionAsts,
  getPreparsedExpressionAst,
  registerPreparsedExpressionAst,
  registerPreparsedExpressionAsts,
} from '../expression-cache/preparsed-expression-ast-registry';

type ICompactWatchDependency = readonly [string, readonly string[], boolean, boolean];

type ICompactStaticMemberSegment = readonly ['s', string | number];
type ICompactComputedMemberSegment = readonly [
  'c',
  string,
  readonly string[] | undefined,
  ((...args: unknown[]) => unknown) | undefined,
  ((...args: unknown[]) => unknown) | undefined,
];
type ICompactMemberSegment =
  | ICompactStaticMemberSegment
  | ICompactComputedMemberSegment;

type ICompactMemberChain =
  | readonly [string, readonly ICompactMemberSegment[]]
  | null
  | undefined;

type ICompactSequenceOperand = readonly [
  string,
  readonly string[],
  (...args: unknown[]) => unknown,
];

type ICompactCompiledPlanEntry = readonly [
  string,
  readonly string[],
  readonly ICompactWatchDependency[],
  ICompiledExpressionPlan['expressionType'],
  boolean,
  ICompactMemberChain,
  readonly ICompactSequenceOperand[] | null | undefined,
  (...args: unknown[]) => unknown,
  ((...args: unknown[]) => unknown) | undefined,
];

export function expandCompactCompiledPlans(
  compact: readonly ICompactCompiledPlanEntry[],
  includeResolvedEvaluator: boolean,
): Record<string, ICompiledExpressionPlan> {
  const expanded: Record<string, ICompiledExpressionPlan> = {};

  for (let i = 0; i < compact.length; i += 1) {
    const entry = compact[i];
    const expressionString = entry[0];
    const watchDependenciesCompact = entry[2];
    const watchDependencies: ICompiledExpressionWatchDependency[] = new Array(
      watchDependenciesCompact.length,
    );

    for (let j = 0; j < watchDependenciesCompact.length; j += 1) {
      const watchDependency = watchDependenciesCompact[j];
      watchDependencies[j] = {
        name: watchDependency[0],
        ownerPath: watchDependency[1],
        isLeaf: watchDependency[2],
        isMemberExpressionSegment: watchDependency[3],
      };
    }

    const expandedPlan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames: entry[1],
      watchDependencies,
      expressionType: entry[3],
      hasHiddenArgumentArray: entry[4],
      memberChain: deserializeCompactMemberChain(entry[5]),
      sequenceOperands: deserializeCompactSequenceOperands(entry[6]),
      evaluate: entry[7],
    };

    if (includeResolvedEvaluator && entry[8]) {
      expandedPlan.evaluateResolvedDependencies = entry[8];
    }

    expanded[expressionString] = expandedPlan;
  }

  return expanded;
}

function deserializeCompactMemberChain(
  memberChain: ICompactMemberChain,
): ICompiledMemberChainPlan | undefined {
  if (!memberChain) {
    return undefined;
  }

  const segments: ICompiledMemberChainSegment[] = new Array(
    memberChain[1].length,
  );
  for (let i = 0; i < memberChain[1].length; i += 1) {
    const segment = memberChain[1][i];
    if (segment[0] === 's') {
      segments[i] = { kind: 'static', key: segment[1] };
      continue;
    }

    segments[i] = {
      kind: 'computed',
      key: undefined,
      expressionString: segment[1],
      dependencyNames: segment[2],
      evaluateIndex: segment[3],
      evaluateIndexByOwnDependencies: segment[4],
    };
  }

  return {
    rootIdentifier: memberChain[0],
    segments,
  };
}

function deserializeCompactSequenceOperands(
  sequenceOperands: readonly ICompactSequenceOperand[] | null | undefined,
): ICompiledSequenceOperandPlan[] | undefined {
  if (!sequenceOperands) {
    return undefined;
  }

  const operands: ICompiledSequenceOperandPlan[] = new Array(
    sequenceOperands.length,
  );
  for (let i = 0; i < sequenceOperands.length; i += 1) {
    const operand = sequenceOperands[i];
    operands[i] = {
      expressionString: operand[0],
      dependencyNames: operand[1],
      evaluate: operand[2],
    };
  }

  return operands;
}
