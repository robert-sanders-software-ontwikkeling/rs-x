import type { IExpression } from '../expressions/expression-parser.interface';

export type RsxExpressionEngineMode = 'tree' | 'compiled';

export interface ITreeExpressionEngine {
  create(expressionString: string): IExpression<unknown>;
}

export interface ICompiledExpressionEngine {
  tryCreate(expressionString: string): IExpression<unknown> | undefined;
}

export interface IExpressionEngineSelector {
  create(expressionString: string): IExpression<unknown>;
  getMode(): RsxExpressionEngineMode;
}
