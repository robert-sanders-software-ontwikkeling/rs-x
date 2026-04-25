import { parseRsxFileExpressions } from './rsx-file';
import { getRsxExpressionExports } from './rsx-module-exports';

export function generateRsxModuleRuntime(args: {
  fileName: string;
  text: string;
  typed?: boolean;
}): string | null {
  const parsed = parseRsxFileExpressions(args);
  if (!parsed || parsed.expressions.length === 0) {
    return null;
  }

  const expressionExports = getRsxExpressionExports({
    fileName: args.fileName,
    expressions: parsed.expressions,
  });
  const lines = args.typed
    ? [
        "import { rsx } from '@rs-x/expression-parser';",
        "import type { IExpression, IExpressionTree } from '@rs-x/expression-parser';",
        "import type { IIndexWatchRule } from '@rs-x/state-manager';",
        '',
        'type RsxModelValue<T> = T | IExpression<T> | IExpressionTree<T>;',
        'type RsxModelInput<T> = T extends object',
        '  ? { readonly [K in keyof T]: RsxModelValue<T[K]> }',
        '  : T;',
        '',
      ]
    : ["import { rsx } from '@rs-x/expression-parser';", ''];

  for (const expressionExport of expressionExports) {
    if (args.typed) {
      const returnType =
        expressionExport.expression.returnTypeText ?? 'unknown';
      const expressionType = expressionExport.expression.compiled
        ? 'IExpression'
        : 'IExpressionTree';
      lines.push(
        `export const ${expressionExport.exportName} = (`,
        `  model: RsxModelInput<${expressionExport.expression.modelTypeText}>,`,
        '  leafIndexWatchRule?: IIndexWatchRule,',
        `): ${expressionType}<${returnType}> =>`,
        `  rsx<${returnType}, ${expressionExport.expression.modelTypeText}>(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(model, leafIndexWatchRule);`,
        '',
      );
    } else {
      lines.push(
        `export const ${expressionExport.exportName} = (model, leafIndexWatchRule) =>`,
        `  rsx(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(model, leafIndexWatchRule);`,
        '',
      );
    }
  }

  if (expressionExports.length > 0) {
    lines.push(`export default ${expressionExports[0].exportName};`, '');
  }

  return lines.join('\n');
}

function formatRsxRuntimeOptions(expression: {
  readonly preparse: boolean;
  readonly lazy: boolean;
  readonly lazyGroup?: string;
  readonly compiled: boolean;
}): string {
  const options: Record<string, boolean | string> = {
    preparse: expression.preparse,
    lazy: expression.lazy,
    compiled: expression.compiled,
  };

  if (expression.lazyGroup) {
    options.lazyGroup = expression.lazyGroup;
  }

  return JSON.stringify(options);
}
