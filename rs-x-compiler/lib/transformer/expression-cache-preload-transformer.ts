import ts from 'typescript';

import { JsEspreeExpressionParser } from '@rs-x/expression-parser';

import { validateExpressionSites } from '../compiler/expression-site-validator';

interface IPrecompiledExpression {
  readonly expressionString: string;
  readonly generatedCode: string;
  readonly constructorNames: readonly string[];
}

const CORE_MODULE = '@rs-x/core';
const EXPRESSION_PARSER_MODULE = '@rs-x/expression-parser';
const CACHE_IDENTIFIER = '__rsxExpressionCache';

export function createExpressionCachePreloadTransformer(
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  const checker = program.getTypeChecker();
  const precompiledExpressions = collectPrecompiledExpressions(program);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  return () => (sourceFile) => {
    if (precompiledExpressions.length === 0) {
      return sourceFile;
    }

    if (!loadsRsXExpressionParserModule(sourceFile, checker)) {
      return sourceFile;
    }

    const constructorImports = new Set<string>();
    for (const expression of precompiledExpressions) {
      for (const constructorName of expression.constructorNames) {
        constructorImports.add(constructorName);
      }
    }

    const updatedImports = upsertImports(sourceFile, [
      { moduleName: CORE_MODULE, identifiers: ['InjectionContainer'] },
      {
        moduleName: EXPRESSION_PARSER_MODULE,
        identifiers: [
          'RsXExpressionParserInjectionTokens',
          ...Array.from(constructorImports).sort(),
        ],
      },
    ]);

    const precompiledBlock = buildPrecompiledBlock(precompiledExpressions);
    const updatedText = `${printer.printFile(updatedImports)}\n${precompiledBlock}\n`;
    return ts.createSourceFile(
      sourceFile.fileName,
      updatedText,
      sourceFile.languageVersion,
      true,
      ts.ScriptKind.TS,
    );
  };
}

function collectPrecompiledExpressions(program: ts.Program): IPrecompiledExpression[] {
  const expressionParser = new JsEspreeExpressionParser();
  const validSites = validateExpressionSites(program).filter(
    (site) => site.diagnostics.length === 0,
  );
  const uniqueExpressionStrings = Array.from(
    new Set(validSites.map((site) => site.expression)),
  );

  return uniqueExpressionStrings
    .map((expressionString) => {
      try {
        const expressionTree = expressionParser.parse(expressionString) as unknown as Record<
          string,
          unknown
        >;
        const generatedCode = serializeExpressionTree(expressionTree);
        return {
          expressionString,
          generatedCode,
          constructorNames: extractConstructorNames(generatedCode),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as IPrecompiledExpression[];
}

function loadsRsXExpressionParserModule(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }

    if (!ts.isCallExpression(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    if (!ts.isPropertyAccessExpression(node.expression)) {
      ts.forEachChild(node, visit);
      return;
    }

    if (node.expression.name.text !== 'load') {
      ts.forEachChild(node, visit);
      return;
    }

    const objectSymbol = checker.getSymbolAtLocation(node.expression.expression);
    if (!objectSymbol) {
      ts.forEachChild(node, visit);
      return;
    }

    const resolvedObjectSymbol =
      objectSymbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(objectSymbol)
        : objectSymbol;
    if (resolvedObjectSymbol.getName() !== 'InjectionContainer') {
      ts.forEachChild(node, visit);
      return;
    }

    const moduleArgument = node.arguments[0];
    if (!moduleArgument) {
      ts.forEachChild(node, visit);
      return;
    }

    const moduleSymbol = checker.getSymbolAtLocation(moduleArgument);
    if (!moduleSymbol) {
      ts.forEachChild(node, visit);
      return;
    }

    const resolvedModuleSymbol =
      moduleSymbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(moduleSymbol)
        : moduleSymbol;
    if (resolvedModuleSymbol.getName() !== 'RsXExpressionParserModule') {
      ts.forEachChild(node, visit);
      return;
    }

    found = true;
  };

  visit(sourceFile);
  return found;
}

function extractConstructorNames(code: string): string[] {
  const constructorNames = new Set<string>();
  const constructorPattern = /new\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gu;

  for (const match of code.matchAll(constructorPattern)) {
    constructorNames.add(match[1]);
  }

  return Array.from(constructorNames).sort();
}

function serializeExpressionTree(expression: Record<string, unknown>): string {
  const constructorName = getConstructorName(expression);
  const expressionString = String(expression.expressionString ?? '');
  const childExpressions = Array.isArray(expression._childExpressions)
    ? (expression._childExpressions as Record<string, unknown>[])
    : [];

  if (constructorName === 'IdentifierExpression') {
    return `new ${constructorName}(${JSON.stringify(expressionString)})`;
  }

  if (constructorName === 'ConstantNullExpression') {
    return `new ${constructorName}()`;
  }

  if (constructorName === 'ConstantBooleanExpression') {
    const value = expressionString === 'true';
    return `new ${constructorName}(${value})`;
  }

  if (constructorName === 'ConstantNumberExpression') {
    const value = Number(expressionString);
    return `new ${constructorName}(${Number.isFinite(value) ? value : 0})`;
  }

  if (constructorName === 'ConstantStringExpression') {
    return `new ${constructorName}(${JSON.stringify(expressionString)})`;
  }

  if (childExpressions.length === 0) {
    return `new ${constructorName}(${JSON.stringify(expressionString)})`;
  }

  const serializedChildren = childExpressions.map((child) =>
    serializeExpressionTree(child),
  );
  return `new ${constructorName}(${JSON.stringify(expressionString)}, ${serializedChildren.join(', ')})`;
}

function getConstructorName(expression: Record<string, unknown>): string {
  const ctor = expression.constructor as { name?: string } | undefined;
  if (!ctor?.name) {
    throw new Error('Expression constructor is missing');
  }
  return ctor.name;
}

function buildPrecompiledBlock(
  precompiledExpressions: readonly IPrecompiledExpression[],
): string {
  const lines = [
    `const ${CACHE_IDENTIFIER} = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);`,
    ...precompiledExpressions.map(
      (expression) =>
        `${CACHE_IDENTIFIER}.registerExpressionTree(${JSON.stringify(expression.expressionString)}, ${expression.generatedCode});`,
    ),
  ];

  return lines.join('\n');
}

function upsertImports(
  sourceFile: ts.SourceFile,
  requirements: ReadonlyArray<{
    moduleName: string;
    identifiers: readonly string[];
  }>,
): ts.SourceFile {
  const currentStatements = [...sourceFile.statements];
  const statements = [...currentStatements];

  for (const requirement of requirements) {
    upsertNamedImport(statements, requirement.moduleName, requirement.identifiers);
  }

  return ts.factory.updateSourceFile(
    sourceFile,
    ts.factory.createNodeArray(statements),
  );
}

function upsertNamedImport(
  statements: ts.Statement[],
  moduleName: string,
  identifiers: readonly string[],
): void {
  const requestedIdentifiers = identifiers.filter(Boolean);
  if (requestedIdentifiers.length === 0) {
    return;
  }

  const existingIdentifiers = new Set<string>();
  let updatableImportIndex = -1;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!ts.isImportDeclaration(statement)) {
      continue;
    }

    if (!ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    if (statement.moduleSpecifier.text !== moduleName) {
      continue;
    }

    const namedBindings = statement.importClause?.namedBindings;
    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue;
    }

    for (const element of namedBindings.elements) {
      existingIdentifiers.add(element.name.text);
    }

    if (!statement.importClause?.isTypeOnly && updatableImportIndex === -1) {
      updatableImportIndex = i;
    }
  }

  const missingIdentifiers = Array.from(new Set(requestedIdentifiers))
    .filter((identifier) => !existingIdentifiers.has(identifier))
    .sort();
  if (missingIdentifiers.length === 0) {
    return;
  }

  if (updatableImportIndex >= 0) {
    const importDeclaration = statements[updatableImportIndex] as ts.ImportDeclaration;
    const importClause = importDeclaration.importClause!;
    const namedBindings = importClause.namedBindings as ts.NamedImports;
    const newElements = [
      ...namedBindings.elements,
      ...missingIdentifiers.map((identifier) =>
        ts.factory.createImportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier(identifier),
        ),
      ),
    ];

    const uniqueElements = dedupeImportSpecifiers(newElements);
    statements[updatableImportIndex] = ts.factory.updateImportDeclaration(
      importDeclaration,
      importDeclaration.modifiers,
      ts.factory.updateImportClause(
        importClause,
        false,
        importClause.name,
        ts.factory.updateNamedImports(namedBindings, uniqueElements),
      ),
      importDeclaration.moduleSpecifier,
      importDeclaration.attributes,
    );
    return;
  }

  const newImport = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports(
        missingIdentifiers.map((identifier) =>
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier(identifier),
          ),
        ),
      ),
    ),
    ts.factory.createStringLiteral(moduleName),
    undefined,
  );

  const insertionIndex = findImportInsertionIndex(statements);
  statements.splice(insertionIndex, 0, newImport);
}

function dedupeImportSpecifiers(
  elements: readonly ts.ImportSpecifier[],
): ts.ImportSpecifier[] {
  const byName = new Map<string, ts.ImportSpecifier>();
  for (const element of elements) {
    byName.set(element.name.text, element);
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.text.localeCompare(b.name.text),
  );
}

function findImportInsertionIndex(statements: readonly ts.Statement[]): number {
  let index = 0;
  while (index < statements.length && ts.isImportDeclaration(statements[index])) {
    index += 1;
  }
  return index;
}
