import ts from 'typescript';

import { parseRsxFileExpressions } from './rsx-file';
import {
  getRsxExpressionExports,
  getRsxExpressionValueName,
} from './rsx-module-exports';

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
  const expressionExportByValueName = new Map(
    expressionExports.map((expressionExport) => [
      getRsxExpressionValueName(expressionExport.exportName),
      expressionExport.exportName,
    ]),
  );
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
    const dependencies = getSameFileExpressionDependencies({
      expressionText: expressionExport.expression.expression,
      ownExportName: expressionExport.exportName,
      expressionExportByValueName,
    });
    const modelExpression =
      dependencies.length === 0
        ? 'model'
        : `{ ...model, ${dependencies
            .map(
              (dependency) =>
                `${JSON.stringify(dependency.identifier)}: ${dependency.exportName}(model, leafIndexWatchRule)`,
            )
            .join(', ')} }`;
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
        `  rsx<${returnType}, ${expressionExport.expression.modelTypeText}>(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(${modelExpression}, leafIndexWatchRule);`,
        '',
      );
    } else {
      lines.push(
        `export const ${expressionExport.exportName} = (model, leafIndexWatchRule) =>`,
        `  rsx(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(${modelExpression}, leafIndexWatchRule);`,
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

function getSameFileExpressionDependencies(args: {
  readonly expressionText: string;
  readonly ownExportName: string;
  readonly expressionExportByValueName: ReadonlyMap<string, string>;
}): Array<{ readonly identifier: string; readonly exportName: string }> {
  const ownValueName = getRsxExpressionValueName(args.ownExportName);
  const identifiers = getFreeIdentifiersInRsxExpression(args.expressionText);
  const dependencies: Array<{ identifier: string; exportName: string }> = [];
  const seen = new Set<string>();

  for (const identifier of identifiers) {
    if (identifier === ownValueName) {
      continue;
    }
    const exportName = args.expressionExportByValueName.get(identifier);
    if (
      !exportName ||
      exportName === args.ownExportName ||
      seen.has(exportName)
    ) {
      continue;
    }
    seen.add(exportName);
    dependencies.push({ identifier, exportName });
  }

  return dependencies;
}

function getFreeIdentifiersInRsxExpression(expressionText: string): string[] {
  const sourceFile = ts.createSourceFile(
    '__rsx_same_file_dependencies.ts',
    `const __rsx_expression = (${expressionText});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const identifiers = new Set<string>();
  const scopes: Array<ReadonlySet<string>> = [new Set()];

  const visit = (node: ts.Node): void => {
    if (ts.isTypeNode(node)) {
      return;
    }
    if (isFunctionLikeWithBody(node)) {
      const functionScope = new Set<string>();
      for (const parameter of node.parameters) {
        addBindingName(functionScope, parameter.name);
      }
      scopes.push(functionScope);
      ts.forEachChild(node.body, visit);
      scopes.pop();
      return;
    }
    if (ts.isIdentifier(node) && isIdentifierReference(node)) {
      if (!scopes.some((scope) => scope.has(node.text))) {
        identifiers.add(node.text);
      }
      return;
    }
    if (
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isBindingElement(node)
    ) {
      addBindingName(scopes[scopes.length - 1] as Set<string>, node.name);
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return [...identifiers];
}

function isFunctionLikeWithBody(
  node: ts.Node,
): node is ts.FunctionLikeDeclaration & { body: ts.ConciseBody } {
  return (
    (ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node)) &&
    !!node.body
  );
}

function addBindingName(names: Set<string>, name: ts.BindingName): void {
  if (ts.isIdentifier(name)) {
    names.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (!ts.isOmittedExpression(element)) {
      addBindingName(names, element.name);
    }
  }
}

function isIdentifierReference(identifier: ts.Identifier): boolean {
  const parent = identifier.parent;
  if (!parent) {
    return true;
  }
  if (ts.isPropertyAccessExpression(parent) && parent.name === identifier) {
    return false;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === identifier) {
    return false;
  }
  if (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isBindingElement(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isClassDeclaration(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isMethodSignature(parent)) &&
    parent.name === identifier
  ) {
    return false;
  }
  return true;
}
