import type * as Monaco from 'monaco-editor';
import type ts from 'typescript';
import type {
  CallExpression,
  Node,
  Program,
  SourceFile,
  StringLiteralLike,
  Type,
  TypeChecker,
} from 'typescript';

import {
  createInMemoryProgram,
  SOURCE_NAME,
  WRAPPER_FOOTER,
  WRAPPER_HEADER,
} from './playground-rsx-compiler.service';

/**
 * The fixed text that precedes the user script in the wrapped source file.
 * User script offset = WRAPPER_PREFIX.length + cursor offset within user script.
 */
const WRAPPER_PREFIX =
  `import { rsx as __rsx_import } from '@rs-x/expression-parser';\n` +
  WRAPPER_HEADER.join('\n') +
  '\n';

function wrapForCompletion(userScript: string): string {
  return WRAPPER_PREFIX + userScript + '\n' + WRAPPER_FOOTER.join('\n') + '\n';
}

/**
 * Walk the AST to find the first variable declaration named `varName`
 * and return the TypeScript type of its initializer.
 */
function findDeclaredVariableType(
  sourceFile: SourceFile,
  varName: string,
  checker: TypeChecker,
  tsModule: typeof ts,
): Type | null {
  let result: Type | null = null;

  function visit(node: Node): void {
    if (result) return;
    if (
      tsModule.isVariableDeclaration(node) &&
      tsModule.isIdentifier(node.name) &&
      node.name.text === varName
    ) {
      result = checker.getTypeAtLocation(node);
      return;
    }
    tsModule.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
}

/**
 * Fallback completion path for chains whose endpoint TypeScript infers as `any`
 * (e.g. `this`-dependent return types in plain JS object literals).
 *
 * Strategy: append a synthetic `const __rsx_cmp__ = (model).chainExpr;` line to
 * the user script, rebuild the in-memory program, and let TypeScript evaluate the
 * full call expression in context — which resolves `this` correctly.
 */
async function tryGetSyntheticCompletions(args: {
  ts: typeof ts;
  userScript: string;
  wrapped: string;
  wrappedOffset: number;
  program: Program;
  detectExpressionSitesInSourceFile: (
    sourceFile: SourceFile,
    checker: TypeChecker,
  ) => {
    expression: string;
    expressionLiteral: StringLiteralLike;
    callExpression: CallExpression;
  }[];
}): Promise<{ name: string; kind: 'property' | 'method' | 'constructor' }[]> {
  const {
    ts: tsModule,
    userScript,
    wrapped,
    wrappedOffset,
    program,
    detectExpressionSitesInSourceFile,
  } = args;

  const sourceFile = program.getSourceFile(SOURCE_NAME);
  if (!sourceFile) return [];

  const checker = program.getTypeChecker();
  const sites = detectExpressionSitesInSourceFile(sourceFile, checker);

  // Find the expression site that contains the cursor
  const site = sites.find((s) => {
    const start = s.expressionLiteral.getStart(sourceFile) + 1;
    const end = s.expressionLiteral.getEnd() - 1;
    return wrappedOffset >= start && wrappedOffset <= end;
  });
  if (!site) return [];

  const expressionStart = site.expressionLiteral.getStart(sourceFile) + 1;
  const expressionOffset = wrappedOffset - expressionStart;
  const prefixInExpression = site.expression.slice(0, expressionOffset);

  // Find the last dot — everything before it is the chain, after is the prefix
  const lastDot = prefixInExpression.lastIndexOf('.');
  if (lastDot === -1) return [];

  const chainExpr = prefixInExpression.slice(0, lastDot).trim();
  const prefix = prefixInExpression.slice(lastDot + 1);

  // Validate: chain must be non-empty and prefix must be a partial identifier
  if (!chainExpr) return [];
  if (prefix && !/^[A-Za-z_$][\w$]*$/u.test(prefix)) return [];

  // Get model expression text from the source
  const modelNode = site.callExpression.arguments[0];
  if (!modelNode) return [];
  const modelText = wrapped.slice(
    modelNode.getStart(sourceFile),
    modelNode.getEnd(),
  );

  // Build a synthetic program where `(model).chainExpr` is assigned to a variable
  const syntheticVar = '__rsx_completion_target__';
  const syntheticLine = `\nconst ${syntheticVar} = (${modelText}).${chainExpr};\n`;
  const modifiedWrapped = wrapForCompletion(userScript + '\n' + syntheticLine);

  const syntheticProgram = createInMemoryProgram({
    ts: tsModule,
    sourceText: modifiedWrapped,
  });
  const syntheticSourceFile = syntheticProgram.getSourceFile(SOURCE_NAME);
  if (!syntheticSourceFile) return [];
  const syntheticChecker = syntheticProgram.getTypeChecker();

  const syntheticType = findDeclaredVariableType(
    syntheticSourceFile,
    syntheticVar,
    syntheticChecker,
    tsModule,
  );
  if (!syntheticType) return [];

  // If still `any`, we can't offer useful completions
  if (syntheticType.flags & tsModule.TypeFlags.Any) return [];

  const names = syntheticType
    .getProperties()
    .map((p) => p.getName())
    .filter((name) => name.startsWith(prefix))
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .sort();

  return names.map((name) => {
    const prop = syntheticType.getProperty(name);
    const decl = prop?.valueDeclaration ?? prop?.declarations?.[0];
    const isMethod =
      decl != null &&
      syntheticChecker
        .getTypeOfSymbolAtLocation(prop!, decl)
        .getCallSignatures().length > 0;
    return {
      name,
      kind: (isMethod ? 'method' : 'property') as 'property' | 'method',
    };
  });
}

export function installRsxCompletionProvider(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
): () => void {
  const provider = monaco.languages.registerCompletionItemProvider(
    'typescript',
    {
      triggerCharacters: ['.'],
      provideCompletionItems: async (activeModel, position) => {
        if (activeModel.id !== model.id) {
          return { suggestions: [] };
        }

        const [
          { getRsxCompletionsAtPosition, detectExpressionSitesInSourceFile },
          tsModule,
        ] = await Promise.all([import('@rs-x/compiler'), import('typescript')]);
        const ts = tsModule.default;

        const userScript = model.getValue();
        const userOffset = model.getOffsetAt(position);
        const wrapped = wrapForCompletion(userScript);
        const wrappedOffset = WRAPPER_PREFIX.length + userOffset;

        const program = createInMemoryProgram({ ts, sourceText: wrapped });
        const completions = getRsxCompletionsAtPosition(
          program,
          SOURCE_NAME,
          wrappedOffset,
        );

        const items =
          completions.length > 0
            ? completions
            : await tryGetSyntheticCompletions({
                ts,
                userScript,
                wrapped,
                wrappedOffset,
                program,
                detectExpressionSitesInSourceFile,
              });

        if (items.length === 0) {
          return { suggestions: [] };
        }

        const wordInfo = activeModel.getWordUntilPosition(position);
        const replaceRange = new monaco.Range(
          position.lineNumber,
          wordInfo.startColumn,
          position.lineNumber,
          wordInfo.endColumn,
        );

        return {
          suggestions: items.map((item) => ({
            label: item.name,
            kind:
              item.kind === 'method'
                ? monaco.languages.CompletionItemKind.Method
                : item.kind === 'constructor'
                  ? monaco.languages.CompletionItemKind.Constructor
                  : monaco.languages.CompletionItemKind.Property,
            insertText: item.name,
            range: replaceRange,
          })),
        };
      },
    },
  );

  return () => provider.dispose();
}
