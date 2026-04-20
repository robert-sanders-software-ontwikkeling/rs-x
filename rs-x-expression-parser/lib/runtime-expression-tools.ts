import { CompiledExpressionCompiler } from './compiled-expression/compiled-expression.compiler';
import type { ICompiledExpressionPlan } from './compiled-expression/compiled-expression.compiler.interface';
import type { AbstractExpression } from './expressions/abstract-expression';
import { ExpressionTreeBuilder } from './expression-tree-builder';
import { JsExpressionAstParser } from './js-expression-ast-parser';

export function parseExpressionStringToTree(
  expressionString: string,
): AbstractExpression {
  const astParser = new JsExpressionAstParser();
  const treeBuilder = new ExpressionTreeBuilder();
  const expressionAst = astParser.parse(expressionString);
  return treeBuilder.parseAst(expressionAst, expressionString);
}

export function tryCompileExpressionString(
  expressionString: string,
): ICompiledExpressionPlan | undefined {
  const compiler = new CompiledExpressionCompiler(new JsExpressionAstParser());
  return compiler.tryCompile(expressionString);
}
