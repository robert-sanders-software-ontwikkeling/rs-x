import ts from 'typescript';

import {
  createRsxBackedProgramForFile,
  parseRsxFileExpressions,
} from './rsx-file';
import { getRsxExpressionExports } from './rsx-module-exports';

export function getRsxVirtualDeclarationFileName(fileName: string): string {
  return `${fileName}.d.ts`;
}

export function getRsxFileNameFromVirtualDeclaration(
  fileName: string,
): string | null {
  return fileName.endsWith('.rsx.d.ts')
    ? fileName.slice(0, -'.d.ts'.length)
    : null;
}

export function generateRsxModuleDeclaration(args: {
  fileName: string;
  text: string;
  compilerOptions?: ts.CompilerOptions;
  rootNames?: readonly string[];
}): string | null {
  const parsed = parseRsxFileExpressions(args);
  if (!parsed || parsed.expressions.length === 0) {
    return null;
  }

  const expressionExports = getRsxExpressionExports({
    fileName: args.fileName,
    expressions: parsed.expressions,
  }).map(({ expression, exportName }) => {
    const returnType =
      expression.returnTypeText ??
      inferRsxReturnTypeFromExpression({
        fileName: args.fileName,
        text: args.text,
        modelTypeText: expression.modelTypeText,
        expression: expression.expression,
        compilerOptions: args.compilerOptions,
        rootNames: args.rootNames,
      }) ??
      'unknown';
    return { expression, exportName, returnType };
  });

  const lines = [
    "import type { IExpression } from '@rs-x/expression-parser';",
    "import type { IExpressionTree } from '@rs-x/expression-parser';",
    "import type { IIndexWatchRule } from '@rs-x/state-manager';",
    '',
  ];

  for (const expressionExport of expressionExports) {
    lines.push(`declare const ${expressionExport.exportName}: (`);
    lines.push(`  model: ${expressionExport.expression.modelTypeText},`);
    lines.push('  leafIndexWatchRule?: IIndexWatchRule,');
    lines.push(
      `) => ${expressionExport.expression.compiled ? 'IExpression' : 'IExpressionTree'}<${expressionExport.returnType}>;`,
    );
    lines.push('');
  }

  if (expressionExports.length > 1 || expressionExports[0]?.expression.name) {
    lines.push(
      `export { ${expressionExports.map((entry) => entry.exportName).join(', ')} };`,
    );
  }

  if (expressionExports.length > 0) {
    lines.push(`export default ${expressionExports[0].exportName};`);
    lines.push('');
  }

  return lines.join('\n');
}

function inferRsxReturnTypeFromExpression(args: {
  fileName: string;
  text: string;
  modelTypeText: string;
  expression: string;
  compilerOptions?: ts.CompilerOptions;
  rootNames?: readonly string[];
}): string | null {
  const options = args.compilerOptions ?? {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    jsx: ts.JsxEmit.Preserve,
  };
  const scriptTarget = options.target ?? ts.ScriptTarget.Latest;
  const modelPropertyNames = resolveTopLevelModelPropertyNames({
    fileName: args.fileName,
    text: args.text,
    options,
    rootNames: args.rootNames,
  });

  const virtualInferenceFileName = `${args.fileName}.__rsx-return-infer__.ts`;
  const declarations = modelPropertyNames
    .map(
      (propertyName) =>
        `declare const ${propertyName}: __RSX_MODEL[${JSON.stringify(propertyName)}];`,
    )
    .join('\n');
  const inferenceSource = [
    `type __RSX_MODEL = ${args.modelTypeText};`,
    declarations,
    'const __rsx_expression = (',
    args.expression,
    ');',
  ]
    .filter((segment) => segment.length > 0)
    .join('\n');

  const baseHost = ts.createCompilerHost(options, true);
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists(fileName) {
      if (fileName === virtualInferenceFileName) {
        return true;
      }
      return baseHost.fileExists(fileName);
    },
    readFile(fileName) {
      if (fileName === virtualInferenceFileName) {
        return inferenceSource;
      }
      return baseHost.readFile(fileName);
    },
    getSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (fileName === virtualInferenceFileName) {
        return ts.createSourceFile(
          virtualInferenceFileName,
          inferenceSource,
          languageVersion ?? scriptTarget,
          true,
          ts.ScriptKind.TS,
        );
      }
      return baseHost.getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };

  const program = ts.createProgram({
    rootNames: [virtualInferenceFileName],
    options,
    host,
  });
  const sourceFile = program.getSourceFile(virtualInferenceFileName);
  if (!sourceFile) {
    return null;
  }

  const expressionDeclaration = sourceFile.statements
    .find(
      (statement): statement is ts.VariableStatement =>
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === '__rsx_expression' &&
            Boolean(declaration.initializer),
        ),
    )
    ?.declarationList.declarations.find(
      (declaration) =>
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === '__rsx_expression' &&
        Boolean(declaration.initializer),
    );

  if (!expressionDeclaration?.initializer) {
    return null;
  }

  const checker = program.getTypeChecker();
  const expressionType = checker.getTypeAtLocation(
    expressionDeclaration.initializer,
  );
  const displayType = checker.getBaseTypeOfLiteralType(expressionType);
  return checker.typeToString(displayType);
}

function resolveTopLevelModelPropertyNames(args: {
  fileName: string;
  text: string;
  options: ts.CompilerOptions;
  rootNames?: readonly string[];
}): string[] {
  const rootNames = Array.from(
    new Set([...(args.rootNames ?? []), args.fileName]),
  );
  const scriptTarget = args.options.target ?? ts.ScriptTarget.Latest;
  const baseHost = ts.createCompilerHost(args.options, true);
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists(fileName) {
      if (fileName === args.fileName) {
        return true;
      }
      return baseHost.fileExists(fileName);
    },
    readFile(fileName) {
      if (fileName === args.fileName) {
        return args.text;
      }
      return baseHost.readFile(fileName);
    },
    getSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      if (fileName === args.fileName) {
        return ts.createSourceFile(
          args.fileName,
          args.text,
          languageVersion ?? scriptTarget,
          true,
          ts.ScriptKind.TS,
        );
      }

      return baseHost.getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };

  const program = ts.createProgram({
    rootNames,
    options: args.options,
    host,
  });
  const rsxBacked = createRsxBackedProgramForFile(
    program,
    args.fileName,
    args.text,
  );
  if (!rsxBacked) {
    return [];
  }

  const checker = rsxBacked.program.getTypeChecker();
  const modelAlias = rsxBacked.virtualSourceFile.statements.find(
    (statement): statement is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === '__RSX_MODEL',
  );
  if (!modelAlias) {
    return [];
  }

  return checker
    .getTypeFromTypeNode(modelAlias.type)
    .getProperties()
    .map((property) => property.getName())
    .filter((propertyName) => /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(propertyName));
}

export function createRsxImportAwareCompilerHost(args: {
  options: ts.CompilerOptions;
  rootNames: readonly string[];
}): ts.CompilerHost {
  const { options } = args;
  const defaultHost = ts.createCompilerHost(options, true);

  const resolveModuleNames: ts.CompilerHost['resolveModuleNames'] = (
    moduleNames,
    containingFile,
    reusedNames,
    redirectedReference,
    compilerOptions,
  ) =>
    moduleNames.map((moduleName) => {
      const resolvedRsxFileName = resolveRsxModuleFileName(
        containingFile,
        moduleName,
      );
      if (!resolvedRsxFileName) {
        return ts.resolveModuleName(
          moduleName,
          containingFile,
          compilerOptions ?? options,
          defaultHost,
          undefined,
          redirectedReference,
        ).resolvedModule;
      }

      return {
        resolvedFileName: getRsxVirtualDeclarationFileName(resolvedRsxFileName),
        extension: ts.Extension.Dts,
        isExternalLibraryImport: false,
      };
    });

  return {
    ...defaultHost,
    resolveModuleNames,
    fileExists(fileName) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        return ts.sys.fileExists(rsxFileName);
      }
      return defaultHost.fileExists(fileName);
    },
    readFile(fileName) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        const text = ts.sys.readFile(rsxFileName);
        return typeof text === 'string'
          ? (generateRsxModuleDeclaration({
              fileName: rsxFileName,
              text,
              compilerOptions: options,
              rootNames: args.rootNames,
            }) ?? undefined)
          : undefined;
      }
      return defaultHost.readFile(fileName);
    },
    getSourceFile(
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) {
      const rsxFileName = getRsxFileNameFromVirtualDeclaration(fileName);
      if (rsxFileName) {
        const text = ts.sys.readFile(rsxFileName);
        if (typeof text !== 'string') {
          return undefined;
        }
        const declarationText = generateRsxModuleDeclaration({
          fileName: rsxFileName,
          text,
          compilerOptions: options,
          rootNames: args.rootNames,
        });
        if (typeof declarationText !== 'string') {
          return undefined;
        }
        return ts.createSourceFile(
          fileName,
          declarationText,
          languageVersion,
          true,
          ts.ScriptKind.TS,
        );
      }

      return defaultHost.getSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      );
    },
  };
}

function resolveRelativePath(
  containingFile: string,
  moduleName: string,
): string {
  const normalizedContainingFile = containingFile.replace(/\\/gu, '/');
  const containingDirectory = normalizedContainingFile.includes('/')
    ? normalizedContainingFile.slice(
        0,
        normalizedContainingFile.lastIndexOf('/'),
      )
    : '.';
  const joined = `${containingDirectory}/${moduleName}`.replace(/\\/gu, '/');
  const parts = joined.split('/');
  const normalizedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      normalizedParts.pop();
      continue;
    }
    normalizedParts.push(part);
  }

  const prefix = joined.startsWith('/') ? '/' : '';
  return `${prefix}${normalizedParts.join('/')}`;
}

function resolveRsxModuleFileName(
  containingFile: string,
  moduleName: string,
): string | null {
  if (!isRelativeModuleName(moduleName)) {
    return null;
  }

  const candidates = moduleName.endsWith('.rsx')
    ? [moduleName]
    : [`${moduleName}.rsx`, `${moduleName}/index.rsx`];
  for (const candidate of candidates) {
    const resolvedFileName = resolveRelativePath(containingFile, candidate);
    if (ts.sys.fileExists(resolvedFileName)) {
      return resolvedFileName;
    }
  }

  return null;
}

function isRelativeModuleName(moduleName: string): boolean {
  return (
    moduleName.startsWith('./') ||
    moduleName.startsWith('../') ||
    moduleName === '.' ||
    moduleName === '..'
  );
}
