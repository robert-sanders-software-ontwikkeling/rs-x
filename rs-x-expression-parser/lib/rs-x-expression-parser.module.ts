import { ContainerModule, InjectionContainer } from '@rs-x/core';

import { CompiledExpressionCompiler } from './compiled-expression/compiled-expression.compiler';
import type { ICompiledExpressionCompiler } from './compiled-expression/compiled-expression.compiler.interface';
import { CompiledExpressionEngine } from './expression-engine/compiled-expression-engine';
import {
  type ICompiledExpressionEngine,
  type ITreeExpressionEngine,
} from './expression-engine/expression-engine.interface';
import { TreeExpressionEngine } from './expression-engine/tree-expression-engine';
import type { IExpressionParser } from './expressions/expression-parser.interface';
import { type ExpressionTreeBuilder } from './expression-tree-builder';
import { ExpressionTreeBuilder as RuntimeExpressionTreeBuilder } from './expression-tree-builder';
import {
  type IJsExpressionAstParser,
  JsExpressionAstParser,
} from './js-expression-ast-parser';
import { JsExpressionParser } from './js-expression-parser';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';
import { RsXExpressionRuntimeModule } from './rs-x-expression-runtime.module';

InjectionContainer.load(RsXExpressionRuntimeModule);

export const RsXExpressionParserModule = new ContainerModule((options) => {
  options.unbind(RsXExpressionParserInjectionTokens.IExpressionTreeBuilder);
  options
    .bind<ExpressionTreeBuilder>(
      RsXExpressionParserInjectionTokens.IExpressionTreeBuilder,
    )
    .to(RuntimeExpressionTreeBuilder)
    .inSingletonScope();
  options
    .bind<IJsExpressionAstParser>(
      RsXExpressionParserInjectionTokens.IJsExpressionAstParser,
    )
    .to(JsExpressionAstParser)
    .inSingletonScope();
  options
    .bind<IExpressionParser>(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    )
    .to(JsExpressionParser)
    .inSingletonScope();
  options
    .bind<ICompiledExpressionCompiler>(
      RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler,
    )
    .to(CompiledExpressionCompiler)
    .inSingletonScope();
  options.unbind(RsXExpressionParserInjectionTokens.ITreeExpressionEngine);
  options
    .bind<ITreeExpressionEngine>(
      RsXExpressionParserInjectionTokens.ITreeExpressionEngine,
    )
    .to(TreeExpressionEngine)
    .inSingletonScope();
  options.unbind(RsXExpressionParserInjectionTokens.ICompiledExpressionEngine);
  options
    .bind<ICompiledExpressionEngine>(
      RsXExpressionParserInjectionTokens.ICompiledExpressionEngine,
    )
    .to(CompiledExpressionEngine)
    .inSingletonScope();
});

export async function unloadRsXExpressionParserModule(): Promise<void> {
  await InjectionContainer.unload(RsXExpressionParserModule);
  await InjectionContainer.unload(RsXExpressionRuntimeModule);
}
