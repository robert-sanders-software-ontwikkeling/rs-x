import type { ExpressionType } from '../expressions/expression-parser.interface';

export interface ICompiledExpressionWatchDependency {
  readonly name: string;
  readonly ownerPath: readonly string[];
  readonly isLeaf: boolean;
  readonly isMemberExpressionSegment: boolean;
}

export interface ICompiledMemberChainSegment {
  readonly kind: 'static' | 'computed';
  readonly key?: string | number;
  readonly expressionString?: string;
  readonly dependencyNames?: readonly string[];
  readonly evaluateIndex?: (...args: unknown[]) => unknown;
  readonly evaluateIndexByOwnDependencies?: (...args: unknown[]) => unknown;
}

export interface ICompiledMemberChainPlan {
  readonly rootIdentifier: string;
  readonly segments: readonly ICompiledMemberChainSegment[];
}

export interface ICompiledExpressionPlan {
  readonly expressionString: string;
  readonly dependencyNames: readonly string[];
  readonly watchDependencies: readonly ICompiledExpressionWatchDependency[];
  readonly expressionType: ExpressionType;
  readonly hasHiddenArgumentArray: boolean;
  readonly memberChain?: ICompiledMemberChainPlan;
  readonly sequenceOperands?: readonly ICompiledSequenceOperandPlan[];
  evaluate(...args: unknown[]): unknown;
}

export interface ICompiledSequenceOperandPlan {
  readonly expressionString: string;
  readonly dependencyNames: readonly string[];
  evaluate(...args: unknown[]): unknown;
}

export interface ICompiledExpressionCompiler {
  tryCompile(expressionString: string): ICompiledExpressionPlan | undefined;
}
