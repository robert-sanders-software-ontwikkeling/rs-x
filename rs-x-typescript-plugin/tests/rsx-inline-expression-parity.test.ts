import path from 'node:path';

import ts from 'typescript/lib/tsserverlibrary';
import init = require('../lib/index');

const workspaceRoot = path.resolve(__dirname, '../..');
const inlineFixtureFileName = path.resolve(
  workspaceRoot,
  './rs-x-typescript-plugin/tests/fixtures/rsx-inline-expression-parity.fixture.ts',
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
    ).toEqual(expected.spans);
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
    ).toEqual(expected.spans);
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
