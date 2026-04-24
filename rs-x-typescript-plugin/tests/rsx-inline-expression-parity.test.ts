import path from 'node:path';

import ts from 'typescript/lib/tsserverlibrary';
import init = require('../lib/index');
import {
  createRsxStandaloneLanguageService,
  getRsxDiagnostics,
  rsxSemanticTokenTypes,
} from '../../rs-x-vscode-extension/lib/rsx-standalone-language-service';

const workspaceRoot = path.resolve(__dirname, '../..');
const inlineFixtureFileName = path.resolve(
  workspaceRoot,
  './rs-x-typescript-plugin/tests/fixtures/rsx-inline-expression-parity.fixture.ts',
);
const standaloneFixtureFileName = path.resolve(
  workspaceRoot,
  './rs-x-typescript-plugin/tests/fixtures/rsx-inline-expression-parity.fixture.rsx',
);

const inlineFixtureText = `
declare module '@rs-x/expression-parser' {
  export function rsx<TModel>(
    expression: string,
    options?: { lazy?: boolean },
  ): (model: TModel) => unknown;
}

import { rsx } from '@rs-x/expression-parser';

type Model = {
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
};

const model: Model = {
  a1: 1,
  a2: 2,
  a3: 3,
  a4: 4,
  a5: 5,
};

const singleColor = rsx<Model>('a1 > a2 && a3 < a4', { lazy: true })(model);
const templateColor = rsx<Model>(\`a1 + a2 * a3 - a4 / a5\`, { lazy: true })(model);
const singleComplete = rsx<Model>('a')(model);
const templateComplete = rsx<Model>(\`a\`)(model);
`.trimStart();

describe('rsx inline expression parity', () => {
  it('matches TypeScript lexical classifications for single-quoted inline rsx expression', () => {
    const service = createPluginLanguageService(inlineFixtureText);
    const expression = 'a1 > a2 && a3 < a4';
    const expressionStart = inlineFixtureText.indexOf(expression);
    expect(expressionStart).toBeGreaterThanOrEqual(0);

    const actual = service.getEncodedSyntacticClassifications(
      inlineFixtureFileName,
      {
        start: expressionStart,
        length: expression.length,
      },
    );
    const expected = ts
      .createClassifier()
      .getEncodedLexicalClassifications(
        expression,
        ts.EndOfLineState.None,
        true,
      );

    expect(
      toRelativeSpans({
        spans: actual.spans,
        rangeStart: expressionStart,
        rangeEnd: expressionStart + expression.length,
      }),
    ).toEqual(
      filterClassificationSpans({
        spans: expected.spans,
        excludedClassification: ts.ClassificationType.operator,
      }),
    );
  });

  it('matches TypeScript lexical classifications for template-quoted inline rsx expression', () => {
    const service = createPluginLanguageService(inlineFixtureText);
    const expression = 'a1 + a2 * a3 - a4 / a5';
    const expressionStart = inlineFixtureText.indexOf(expression);
    expect(expressionStart).toBeGreaterThanOrEqual(0);

    const actual = service.getEncodedSyntacticClassifications(
      inlineFixtureFileName,
      {
        start: expressionStart,
        length: expression.length,
      },
    );
    const expected = ts
      .createClassifier()
      .getEncodedLexicalClassifications(
        expression,
        ts.EndOfLineState.None,
        true,
      );

    expect(
      toRelativeSpans({
        spans: actual.spans,
        rangeStart: expressionStart,
        rangeEnd: expressionStart + expression.length,
      }),
    ).toEqual(
      filterClassificationSpans({
        spans: expected.spans,
        excludedClassification: ts.ClassificationType.operator,
      }),
    );
  });

  it('does not emit standard semantic operator classifications for inline rsx expressions', () => {
    const expression = 'a1 + a2 * a3 - a4 / a5';
    const inlineSnapshots = getInlineSemanticSnapshots({
      sourceText: inlineFixtureText,
      expression,
    });
    const inlineOperatorSnapshots = inlineSnapshots.filter(
      (snapshot) => snapshot.type === 'operator',
    );

    expect(inlineOperatorSnapshots).toEqual([]);
    expect(inlineSnapshots.map((snapshot) => snapshot.text)).toEqual(
      expect.arrayContaining(['a1', 'a2', 'a3', 'a4', 'a5']),
    );
  });

  it('returns model completions for single-quoted and template inline rsx expressions', () => {
    const service = createPluginLanguageService(inlineFixtureText);
    const singleStart =
      inlineFixtureText.indexOf("rsx<Model>('a')(model)") +
      "rsx<Model>('".length;
    const templateStart =
      inlineFixtureText.indexOf('rsx<Model>(`a`)(model)') +
      'rsx<Model>(`'.length;

    expect(singleStart).toBeGreaterThanOrEqual(0);
    expect(templateStart).toBeGreaterThanOrEqual(0);

    const singleCompletions = service.getCompletionsAtPosition(
      inlineFixtureFileName,
      singleStart + 1,
      {},
    );
    const templateCompletions = service.getCompletionsAtPosition(
      inlineFixtureFileName,
      templateStart + 1,
      {},
    );

    const singleEntries =
      singleCompletions?.entries.map((entry) => entry.name) ?? [];
    const templateEntries =
      templateCompletions?.entries.map((entry) => entry.name) ?? [];

    expect(singleEntries).toEqual(
      expect.arrayContaining(['a1', 'a2', 'a3', 'a4', 'a5']),
    );
    expect(templateEntries).toEqual(
      expect.arrayContaining(['a1', 'a2', 'a3', 'a4', 'a5']),
    );
  });

  it('keeps inline operator classifications out of the standard semantic operator bucket', () => {
    const expression = 'a1 > a2 && a3 < a4';
    const inlineSnapshots = getInlineSemanticSnapshots({
      sourceText: inlineFixtureText,
      expression,
    });

    const inlineOperatorSnapshots = inlineSnapshots.filter(
      (snapshot) => snapshot.type === 'operator',
    );

    expect(inlineOperatorSnapshots).toEqual([]);
    expect(inlineSnapshots.map((snapshot) => snapshot.text)).toEqual(
      expect.arrayContaining(['a1', 'a2', 'a3', 'a4']),
    );
  });

  it('surfaces the same unsupported diagnostics as standalone .rsx for inline assignment/delete expressions', () => {
    const assignmentExpression = 'hazmat = false';
    const deleteExpression = 'delete hazardCode';

    const standaloneAssignmentMessages =
      getStandaloneUnsupportedMessages(assignmentExpression);
    const standaloneDeleteMessages =
      getStandaloneUnsupportedMessages(deleteExpression);

    expect(standaloneAssignmentMessages).toEqual(
      expect.arrayContaining(['Assignment expressions are not supported']),
    );
    expect(standaloneDeleteMessages).toEqual(
      expect.arrayContaining(['Delete operator is not supported']),
    );

    const inlineAssignmentSingleMessages = getInlineUnsupportedMessages({
      expression: assignmentExpression,
      quoteStyle: 'single',
    });
    const inlineAssignmentTemplateMessages = getInlineUnsupportedMessages({
      expression: assignmentExpression,
      quoteStyle: 'template',
    });
    const inlineDeleteSingleMessages = getInlineUnsupportedMessages({
      expression: deleteExpression,
      quoteStyle: 'single',
    });
    const inlineDeleteTemplateMessages = getInlineUnsupportedMessages({
      expression: deleteExpression,
      quoteStyle: 'template',
    });

    expect(inlineAssignmentSingleMessages).toEqual(
      expect.arrayContaining(['Assignment expressions are not supported']),
    );
    expect(inlineAssignmentTemplateMessages).toEqual(
      expect.arrayContaining(['Assignment expressions are not supported']),
    );
    expect(inlineDeleteSingleMessages).toEqual(
      expect.arrayContaining(['Delete operator is not supported']),
    );
    expect(inlineDeleteTemplateMessages).toEqual(
      expect.arrayContaining(['Delete operator is not supported']),
    );
  });
});

function createPluginLanguageService(sourceText: string): ts.LanguageService {
  const snapshots = new Map<string, string>([
    [inlineFixtureFileName, sourceText],
  ]);

  const languageServiceHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    }),
    getScriptFileNames: () => [inlineFixtureFileName],
    getScriptSnapshot: (fileName) => {
      const text = snapshots.get(fileName);
      return typeof text === 'string'
        ? ts.ScriptSnapshot.fromString(text)
        : undefined;
    },
    getScriptVersion: () => '1',
    getCurrentDirectory: () => workspaceRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      snapshots.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) =>
      snapshots.get(fileName) ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  const baseLanguageService = ts.createLanguageService(languageServiceHost);
  const pluginModule = init({ typescript: ts });
  return pluginModule.create({
    languageService: baseLanguageService,
    languageServiceHost,
    project: {
      getCompilationSettings: () =>
        languageServiceHost.getCompilationSettings?.() ?? {},
    },
  } as unknown as ts.server.PluginCreateInfo);
}

function toRelativeSpans(args: {
  spans: readonly number[];
  rangeStart: number;
  rangeEnd: number;
}): number[] {
  const { spans, rangeStart, rangeEnd } = args;
  const relative: number[] = [];
  for (let index = 0; index < spans.length; index += 3) {
    const start = spans[index];
    const end = start + spans[index + 1];
    const classification = spans[index + 2];
    if (end <= rangeStart || start >= rangeEnd) {
      continue;
    }

    const clampedStart = Math.max(start, rangeStart);
    const clampedEnd = Math.min(end, rangeEnd);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    relative.push(
      clampedStart - rangeStart,
      clampedEnd - clampedStart,
      classification,
    );
  }

  return relative;
}

function filterClassificationSpans(args: {
  spans: readonly number[];
  excludedClassification: number;
}): number[] {
  const filtered: number[] = [];
  for (let index = 0; index < args.spans.length; index += 3) {
    const classification = args.spans[index + 2];
    if (classification === args.excludedClassification) {
      continue;
    }

    filtered.push(args.spans[index], args.spans[index + 1], classification);
  }

  return filtered;
}

function getInlineSemanticSnapshots(args: {
  sourceText: string;
  expression: string;
}): Array<{ text: string; type: string }> {
  const { sourceText, expression } = args;
  const expressionStart = sourceText.indexOf(expression);
  expect(expressionStart).toBeGreaterThanOrEqual(0);

  const service = createPluginLanguageService(sourceText);
  const semantic = service.getEncodedSemanticClassifications(
    inlineFixtureFileName,
    {
      start: expressionStart,
      length: expression.length,
    },
    ts.SemanticClassificationFormat.TwentyTwenty,
  );

  const snapshots: Array<{ text: string; type: string }> = [];
  for (let index = 0; index < semantic.spans.length; index += 3) {
    const start = semantic.spans[index];
    const length = semantic.spans[index + 1];
    const classification = semantic.spans[index + 2];
    const end = start + length;
    if (
      end <= expressionStart ||
      start >= expressionStart + expression.length
    ) {
      continue;
    }

    const tokenType = (classification >> 8) - 1;
    if (tokenType < 0 || tokenType >= rsxSemanticTokenTypes.length) {
      continue;
    }

    const clampedStart = Math.max(start, expressionStart);
    const clampedEnd = Math.min(end, expressionStart + expression.length);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    const text = sourceText.slice(clampedStart, clampedEnd).trim();
    if (text.length === 0) {
      continue;
    }

    snapshots.push({
      text,
      type: rsxSemanticTokenTypes[tokenType]!,
    });
  }

  return snapshots;
}

function getStandaloneUnsupportedMessages(expression: string): string[] {
  const text = [
    'model: { hazardCode: string; hazmat: boolean }',
    'return: boolean',
    '',
    expression,
    '',
  ].join('\n');
  const service = createRsxStandaloneLanguageService({
    fileName: standaloneFixtureFileName,
    text,
  });
  expect(service).not.toBeNull();

  return getRsxDiagnostics(service!).map((diagnostic) => diagnostic.message);
}

function getInlineUnsupportedMessages(args: {
  expression: string;
  quoteStyle: 'single' | 'template';
}): string[] {
  const { expression, quoteStyle } = args;
  const literal =
    quoteStyle === 'single' ? `'${expression}'` : `\`${expression}\``;
  const sourceText = `
declare module '@rs-x/expression-parser' {
  export function rsx<TModel>(
    expression: string,
    options?: { lazy?: boolean },
  ): (model: TModel) => unknown;
}

import { rsx } from '@rs-x/expression-parser';

type Model = {
  hazardCode: string;
  hazmat: boolean;
};

const model: Model = {
  hazardCode: 'HZ',
  hazmat: true,
};

const value = rsx<Model>(${literal})(model);
`.trimStart();

  const service = createPluginLanguageService(sourceText);
  return service
    .getSemanticDiagnostics(inlineFixtureFileName)
    .filter((diagnostic) => diagnostic.source === '@rs-x/typescript-plugin')
    .map((diagnostic) =>
      typeof diagnostic.messageText === 'string'
        ? diagnostic.messageText
        : ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    );
}
