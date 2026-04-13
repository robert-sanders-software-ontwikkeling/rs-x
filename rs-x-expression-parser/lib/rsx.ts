import { InjectionContainer } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import {
  type IExpression,
  type IExpressionTree,
} from './expressions/expression-parser.interface';
import { type IExpressionFactory } from './expression-factory';
import { RsXExpressionParserModule } from './rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

let cachedExpressionFactory: IExpressionFactory | undefined;

export interface IRsxOptions {
  readonly preparse?: boolean;
  readonly lazy?: boolean;
  readonly compiled?: boolean;
}

/**
 * Global RS-X compile-time configuration.
 *
 * Augment this interface in your project to set global defaults.
 * When `compiledByDefault` is `true`, `rsx("expr")` without an explicit
 * `compiled` option returns `IExpression<T>` (no tree structure).
 *
 * @example — compiled-by-default project (add to a .d.ts included by tsconfig):
 * ```ts
 * declare module '@rs-x/expression-parser' {
 *   interface IRsxConfig {
 *     compiledByDefault: true;
 *   }
 * }
 * ```
 */

export interface IRsxConfig {}

type IsCompiledByDefault = IRsxConfig extends { compiledByDefault: true }
  ? true
  : false;

/** Return type for `rsx()` when no explicit `compiled` option is given. */
type DefaultRsxReturn<TReturn> = IsCompiledByDefault extends true
  ? IExpression<TReturn>
  : IExpressionTree<TReturn>;

const ensureExpressionFactory = (): void => {
  if (
    !InjectionContainer.isBound(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    )
  ) {
    InjectionContainer.load(RsXExpressionParserModule);

    if (
      !InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionFactory,
      )
    ) {
      throw new Error(
        'RS-X: Failed to initialize ExpressionFactory. RsXExpressionParserModule no loaded.',
      );
    }
  }
};

export const getExpressionFactory = (): IExpressionFactory => {
  if (!cachedExpressionFactory) {
    ensureExpressionFactory();

    cachedExpressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;
  }

  return cachedExpressionFactory;
};

/**
 * Compiled mode — explicitly compiled, returns IExpression<TReturn> (no tree structure).
 */
export function rsx<TReturn, TModel extends object = object>(
  expressionString: string,
  options: IRsxOptions & { readonly compiled: true },
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => IExpression<TReturn>;

/**
 * Tree mode — explicitly not compiled, returns IExpressionTree<TReturn>.
 */
export function rsx<TReturn, TModel extends object = object>(
  expressionString: string,
  options: IRsxOptions & { readonly compiled: false },
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => IExpressionTree<TReturn>;

/**
 * Default mode — no explicit `compiled` option.
 * Return type is `IExpressionTree<TReturn>` unless `IRsxConfig.compiledByDefault`
 * is augmented to `true`, in which case it is `IExpression<TReturn>`.
 */
export function rsx<TReturn, TModel extends object = object>(
  expressionString: string,
  options?: IRsxOptions,
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => DefaultRsxReturn<TReturn>;

export function rsx<TReturn, TModel extends object = object>(
  expressionString: string,
  options?: IRsxOptions,
): (
  model: TModel,
  leafIndexWatchRule?: IIndexWatchRule,
) => IExpression<TReturn> {
  return (
    model: TModel,
    leafIndexWatchRule?: IIndexWatchRule,
  ): IExpression<TReturn> => {
    return getExpressionFactory().create(
      model,
      expressionString,
      leafIndexWatchRule,
      options?.compiled,
      options?.lazy,
    );
  };
}
