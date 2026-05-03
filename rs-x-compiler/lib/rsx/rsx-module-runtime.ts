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
  debugChangeHooksByExpression?: Readonly<
    Record<
      string,
      {
        readonly group?: RsxDebugHookConfig;
        readonly instances?: Readonly<Record<string, RsxDebugHookConfig>>;
      }
    >
  >;
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
  const debugHookReferences = createRsxDebugHookReferences(
    expressionExports.map((expressionExport) => expressionExport.exportName),
    args,
  );
  const hasDebugHookWrapping = [...debugHookReferences.values()].some(
    (reference) => reference.group || reference.instances.length > 0,
  );
  const rsxImport = hasDebugHookWrapping
    ? "import { rsx } from '@rs-x/expression-parser';"
    : "import { rsx } from '@rs-x/expression-parser';";
  const lines = args.typed
    ? [
        rsxImport,
        ...formatRsxDebugChangeHookImports(debugHookReferences),
        "import type { IExpression, IExpressionTree } from '@rs-x/expression-parser';",
        "import type { IIndexWatchRule } from '@rs-x/state-manager';",
        '',
        'type RsxModelValue<T> = T | IExpression<T> | IExpressionTree<T>;',
        'type RsxModelInput<T> = T extends object',
        '  ? { readonly [K in keyof T]: RsxModelValue<T[K]> }',
        '  : T;',
        '',
      ]
    : [rsxImport, ...formatRsxDebugChangeHookImports(debugHookReferences), ''];

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
      const debugHookReference = debugHookReferences.get(
        expressionExport.exportName,
      );
      if (
        debugHookReference &&
        (debugHookReference.group || debugHookReference.instances.length > 0)
      ) {
        lines.push(
          `export const ${expressionExport.exportName} = (`,
          `  model: RsxModelInput<${expressionExport.expression.modelTypeText}>,`,
          '  leafIndexWatchRule?: IIndexWatchRule,',
          '  __rsxDebugInstanceId?: string,',
          `): ${expressionType}<${returnType}> => {`,
          `  const expression = rsx<${returnType}, ${expressionExport.expression.modelTypeText}>(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(${modelExpression}, leafIndexWatchRule);`,
          ...formatRsxDebugHookResolutionLines(debugHookReference),
          ...formatRsxDebugChangeHookAssignmentLines(
            args.fileName,
            expressionExport.exportName,
            expressionExport.expression,
          ),
          '  return expression;',
          '};',
          '',
        );
      } else {
        lines.push(
          `export const ${expressionExport.exportName} = (`,
          `  model: RsxModelInput<${expressionExport.expression.modelTypeText}>,`,
          '  leafIndexWatchRule?: IIndexWatchRule,',
          '  __rsxDebugInstanceId?: string,',
          `): ${expressionType}<${returnType}> =>`,
          `  rsx<${returnType}, ${expressionExport.expression.modelTypeText}>(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(${modelExpression}, leafIndexWatchRule);`,
          '',
        );
      }
    } else {
      const debugHookReference = debugHookReferences.get(
        expressionExport.exportName,
      );
      if (
        debugHookReference &&
        (debugHookReference.group || debugHookReference.instances.length > 0)
      ) {
        lines.push(
          `export const ${expressionExport.exportName} = (model, leafIndexWatchRule, __rsxDebugInstanceId) => {`,
          `  const expression = rsx(${JSON.stringify(expressionExport.expression.expression)}, ${formatRsxRuntimeOptions(expressionExport.expression)})(${modelExpression}, leafIndexWatchRule);`,
          ...formatRsxDebugHookResolutionLines(debugHookReference),
          ...formatRsxDebugChangeHookAssignmentLines(
            args.fileName,
            expressionExport.exportName,
            expressionExport.expression,
          ),
          '  return expression;',
          '};',
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
  }

  if (expressionExports.length > 0) {
    lines.push(`export default ${expressionExports[0].exportName};`, '');
  }

  return lines.join('\n');
}

type RsxDebugHookConfig = {
  readonly moduleSpecifier: string;
  readonly exportName?: string;
  readonly enabled?: boolean;
};

type RsxDebugHookReference = {
  readonly group?: RsxDebugHookImportReference;
  readonly instances: readonly RsxDebugHookInstanceReference[];
};

type RsxDebugHookImportReference = {
  readonly moduleSpecifier: string;
  readonly exportName?: string;
  readonly localName: string;
};

type RsxDebugHookInstanceReference = {
  readonly instanceId: string;
  readonly hook?: RsxDebugHookImportReference;
};

function createRsxDebugHookReferences(
  exportNames: readonly string[],
  args: {
    readonly debugChangeHooksByExpression?: Readonly<
      Record<
        string,
        {
          readonly group?: RsxDebugHookConfig;
          readonly instances?: Readonly<Record<string, RsxDebugHookConfig>>;
        }
      >
    >;
  },
): ReadonlyMap<string, RsxDebugHookReference> {
  const references = new Map<string, RsxDebugHookReference>();
  for (const exportName of exportNames) {
    const expressionConfig = args.debugChangeHooksByExpression?.[exportName];
    if (!expressionConfig) {
      continue;
    }
    const group =
      expressionConfig.group?.enabled !== false &&
      expressionConfig.group?.moduleSpecifier
        ? {
            ...expressionConfig.group,
            localName: `__rsxDebugChangeHook_${sanitizeIdentifier(exportName)}`,
          }
        : undefined;
    const instances = Object.entries(expressionConfig.instances ?? {}).map(
      ([instanceId, hookConfig], index): RsxDebugHookInstanceReference => ({
        instanceId,
        hook:
          hookConfig.enabled === false || !hookConfig.moduleSpecifier
            ? undefined
            : {
                ...hookConfig,
                localName: `__rsxDebugChangeHook_${sanitizeIdentifier(exportName)}_${index}`,
              },
      }),
    );
    if (group || instances.length > 0) {
      references.set(exportName, { group, instances });
    }
  }
  return references;
}

function formatRsxDebugChangeHookImports(
  debugHookReferences: ReadonlyMap<string, RsxDebugHookReference>,
): string[] {
  const imports: string[] = [];
  const seen = new Set<string>();
  for (const debugHookReference of debugHookReferences.values()) {
    const hooks = [
      debugHookReference.group,
      ...debugHookReference.instances.map((instance) => instance.hook),
    ];
    for (const debugChangeHook of hooks) {
      if (!debugChangeHook?.moduleSpecifier) {
        continue;
      }
      const key = `${debugChangeHook.moduleSpecifier}\n${debugChangeHook.exportName ?? ''}\n${debugChangeHook.localName}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const moduleSpecifier = JSON.stringify(debugChangeHook.moduleSpecifier);
      const exportName = debugChangeHook.exportName?.trim();
      if (!exportName || exportName === 'default') {
        imports.push(
          `import ${debugChangeHook.localName} from ${moduleSpecifier};`,
        );
        continue;
      }
      imports.push(
        `import { ${exportName} as ${debugChangeHook.localName} } from ${moduleSpecifier};`,
      );
    }
  }
  return imports;
}

function formatRsxDebugHookResolutionLines(
  debugHookReference: RsxDebugHookReference,
): string[] {
  const instanceEntries = debugHookReference.instances.map(
    (instance) =>
      `${JSON.stringify(instance.instanceId)}: ${instance.hook?.localName ?? 'null'}`,
  );
  return [
    `  const __rsxDebugHooksByInstance = { ${instanceEntries.join(', ')} };`,
    `  const __rsxDebugInstanceHook = __rsxDebugInstanceId && Object.prototype.hasOwnProperty.call(__rsxDebugHooksByInstance, __rsxDebugInstanceId) ? __rsxDebugHooksByInstance[__rsxDebugInstanceId] : undefined;`,
    `  const __rsxDebugResolvedHook = __rsxDebugInstanceHook === undefined ? ${debugHookReference.group?.localName ?? 'undefined'} : __rsxDebugInstanceHook;`,
  ];
}

function formatRsxDebugChangeHookAssignmentLines(
  fileName: string,
  exportName: string,
  expression: {
    readonly nameStart?: number;
    readonly nameEnd?: number;
    readonly expressionStart: number;
    readonly expressionEnd: number;
  },
): string[] {
  return [
    '  if (__rsxDebugResolvedHook) {',
    `    const __rsxDebugMetadata = ${formatRsxDebugInstanceMetadata(fileName, exportName, expression)};`,
    '    expression.changeHook = (changedExpression, oldValue) => {',
    '      __rsxDebugResolvedHook(__rsxDebugMetadata, changedExpression, oldValue);',
    '    };',
    '  }',
  ];
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_$]/gu, '_');
  return /^[A-Za-z_$]/u.test(sanitized) ? sanitized : `_${sanitized}`;
}

function formatRsxDebugInstanceMetadata(
  fileName: string,
  exportName: string,
  expression: {
    readonly nameStart?: number;
    readonly nameEnd?: number;
    readonly expressionStart: number;
    readonly expressionEnd: number;
  },
): string {
  return `{${[
    `"expressionName":${JSON.stringify(exportName)}`,
    '"instanceId":__rsxDebugInstanceId',
    `"source":${JSON.stringify({
      fileName,
      start: expression.nameStart ?? expression.expressionStart,
      end: expression.nameEnd ?? expression.expressionEnd,
    })}`,
  ].join(',')}}`;
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
