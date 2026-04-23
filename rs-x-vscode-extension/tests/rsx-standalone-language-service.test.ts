import path from 'node:path';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { parseRsxFileExpressions } from '../../rs-x-compiler/lib/rsx/rsx-file';
import {
  getRsxCodeFixes,
  getRsxCompletionsAtPosition,
  createRsxStandaloneLanguageService,
  getRsxDiagnostics,
  getRsxDefinitionsAtPosition,
  getRsxDocumentSymbols,
  getRsxHoverAtPosition,
  getRsxImplementationsAtPosition,
  getRsxReferencesAtPosition,
  getRsxRenameLocationsAtPosition,
  getRsxSemanticTokens,
  getRsxSyntacticTokensForText,
  getRsxSignatureHelpAtPosition,
  rsxSemanticTokenTypes,
} from '../lib/rsx-standalone-language-service';

const workspaceRoot = path.resolve(__dirname, '../..');
const rsxFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
);
const modelFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-compiler/tests/fixtures/rsx-file-model.fixture.ts',
);
const implementationFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-vscode-extension/tests/fixtures/rsx-implementation.fixture.rsx',
);
const implementationModelFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-vscode-extension/tests/fixtures/rsx-implementation-model.fixture.ts',
);
const modulePerformanceFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-vscode-extension/tests/fixtures/rsx-module-performance.fixture.rsx',
);

describe('rsx standalone language service', () => {
  it('resolves definitions from standalone .rsx files into imported model types', () => {
    const document = createFixtureDocument();
    const lineTotalOffset = document.text.indexOf('lineTotal');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    expect(service).not.toBeNull();

    const definitions = getRsxDefinitionsAtPosition(service!, lineTotalOffset);
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: modelFixturePath,
        }),
      ]),
    );

    const modelText = readFileSync(modelFixturePath, 'utf8');
    const expectedStart = modelText.indexOf('lineTotal');
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: modelFixturePath,
          start: expectedStart,
          end: expectedStart + 'lineTotal'.length,
        }),
      ]),
    );
  });

  it('finds references for standalone .rsx symbols across the rsx file and model contract', () => {
    const document = createFixtureDocument();
    const lineTotalOffset = document.text.indexOf('lineTotal');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const references = getRsxReferencesAtPosition(service!, lineTotalOffset);
    expect(references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: rsxFixturePath }),
        expect.objectContaining({ fileName: modelFixturePath }),
      ]),
    );
  });

  it('renames lambda-local symbols within standalone .rsx expressions', () => {
    const document = createFixtureDocument();
    const lineOffset = document.text.indexOf('line) =>');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const locations = getRsxRenameLocationsAtPosition({
      document: service!,
      position: lineOffset,
      newName: 'item',
    });

    expect(locations).toHaveLength(2);
    expect(
      locations.every((location) => location.fileName === rsxFixturePath),
    ).toBe(true);
    expect(locations.map((location) => location.newText)).toEqual([
      'item',
      'item',
    ]);
  });

  it('emits semantic tokens for standalone .rsx expressions', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const tokens = getRsxSemanticTokens(service!);
    const lineToken = tokens.find(
      (token) =>
        document.text.slice(token.start, token.start + token.length) === 'line',
    );
    const lineTotalToken = tokens.find(
      (token) =>
        document.text.slice(token.start, token.start + token.length) ===
        'lineTotal',
    );

    expect(lineToken).toBeDefined();
    expect(lineTotalToken).toBeDefined();
    expect(rsxSemanticTokenTypes[lineToken!.tokenType]).toBe('parameter');
    expect(rsxSemanticTokenTypes[lineTotalToken!.tokenType]).toBe('property');
  });

  it('prefers semantic token kind when semantic and fallback spans overlap', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const lineTotalMatches = getRsxSemanticTokens(service!).filter(
      (token) =>
        document.text.slice(token.start, token.start + token.length) ===
        'lineTotal',
    );

    expect(lineTotalMatches).toHaveLength(1);
    expect(rsxSemanticTokenTypes[lineTotalMatches[0]!.tokenType]).toBe(
      'property',
    );
  });

  it('classifies object-literal projection keys in lines.map expressions like TypeScript', () => {
    const text = `model: { lines: { id: number; qty: number; unitPrice: number }[] }
return: { keyId: number; keyLineTotal: number }[]

lines.map((line) => ({
  keyId: line.id,
  keyLineTotal: line.qty * line.unitPrice
}))`;
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text,
    });
    const tokens = getRsxSemanticTokens(service!);

    const keyIdOffset = text.indexOf('keyId:');
    const keyLineTotalOffset = text.indexOf('keyLineTotal:');
    const keyIdToken = tokens.find((token) => token.start === keyIdOffset);
    const keyLineTotalToken = tokens.find(
      (token) => token.start === keyLineTotalOffset,
    );

    expect(keyIdToken).toBeDefined();
    expect(keyLineTotalToken).toBeDefined();
    expect(rsxSemanticTokenTypes[keyIdToken!.tokenType]).toBe('property');
    expect(rsxSemanticTokenTypes[keyLineTotalToken!.tokenType]).toBe(
      'property',
    );
  });
  it('does not emit fallback identifier semantic tokens', () => {
    const text = 'model: { shippingMethod: string }\n\nshippingMethod';
    const tokens = getRsxSyntacticTokensForText(text);
    const shippingMethodTokens = tokens.filter(
      (token) =>
        text.slice(token.start, token.start + token.length) ===
        'shippingMethod',
    );

    expect(shippingMethodTokens).toEqual([]);
  });

  it('emits semantic operator tokens for comparison operators', () => {
    const text = 'model: { a: number; b: number }\n\na > b && a >= b';
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text,
    });

    const expressionStart = text.lastIndexOf('a > b && a >= b');
    const tokens = getRsxSemanticTokens(service!);
    const operatorLikeTokens = tokens.filter(
      (token) =>
        token.start >= expressionStart &&
        /^[+\-*\/%<>=!&|^~?:.,;()\[\]{}]+$/u.test(
          text.slice(token.start, token.start + token.length).trim(),
        ),
    );

    expect(
      operatorLikeTokens.map((token) =>
        text.slice(token.start, token.start + token.length).trim(),
      ),
    ).toEqual(expect.arrayContaining(['>', '&&', '=']));
  });
  it('resolves module-expression semantic tokens under 2s with operator coverage', () => {
    const text = readFileSync(modulePerformanceFixturePath, 'utf8');
    const parsed = parseRsxFileExpressions({
      fileName: modulePerformanceFixturePath,
      text,
    });

    expect(parsed).not.toBeNull();
    const expression =
      parsed!.expressions.find(
        (candidate) => candidate.name === 'lineTotalsRsx',
      ) ?? parsed!.expressions[0];
    expect(expression).toBeDefined();

    const standaloneTextLines = [`model: ${expression!.modelTypeText}`];
    if (expression!.returnTypeText?.trim()) {
      standaloneTextLines.push(`return: ${expression!.returnTypeText.trim()}`);
    }
    standaloneTextLines.push('', expression!.expression);
    const standaloneText = standaloneTextLines.join('\n');
    const modelPropertyNamesHint =
      extractTopLevelModelPropertyNamesFromTypeText(expression!.modelTypeText);

    const firstStart = performance.now();
    const firstService = createRsxStandaloneLanguageService({
      fileName: modulePerformanceFixturePath,
      text: standaloneText,
      modelPropertyNamesHint,
      virtualFileNameSuffix: 'module-lineTotalsRsx-test',
    });
    const firstTokens = getRsxSemanticTokens(firstService!);
    const firstElapsedMs = performance.now() - firstStart;

    const secondStart = performance.now();
    const secondService = createRsxStandaloneLanguageService({
      fileName: modulePerformanceFixturePath,
      text: standaloneText,
      modelPropertyNamesHint,
      virtualFileNameSuffix: 'module-lineTotalsRsx-test',
    });
    const secondTokens = getRsxSemanticTokens(secondService!);
    const secondElapsedMs = performance.now() - secondStart;

    expect(firstService).not.toBeNull();
    expect(secondService).not.toBeNull();
    expect(firstElapsedMs).toBeLessThanOrEqual(2000);
    expect(secondElapsedMs).toBeLessThanOrEqual(2000);

    const tokenTexts = secondTokens
      .map((token) =>
        secondService!.originalText.slice(
          token.start,
          token.start + token.length,
        ),
      )
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    expect(firstTokens.length).toBeGreaterThan(0);
    expect(
      tokenTexts.some((value) =>
        /^[+\-*\/%<>=!&|^~?:.,;()\[\]{}]+$/u.test(value),
      ),
    ).toBe(true);
    expect(tokenTexts).toEqual(
      expect.arrayContaining(['line', 'lineTotal', 'qty', 'unitPrice']),
    );
  });
  it('returns TypeScript-backed completions for standalone .rsx expressions', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const lineCompletions = getRsxCompletionsAtPosition(
      service!,
      document.text.indexOf('line.lineTotal') + 'line.'.length,
    );
    const headerCompletions = getRsxCompletionsAtPosition(
      service!,
      document.text.indexOf("import('./rsx-file-model.fixture').") +
        "import('./rsx-file-model.fixture').".length,
    );

    expect(lineCompletions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'lineTotal', kind: 'property' }),
      ]),
    );
    expect(headerCompletions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'IModel', kind: 'property' }),
      ]),
    );
  });

  it('returns hover info for lambda locals and model members in standalone .rsx expressions', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const sumHover = getRsxHoverAtPosition(
      service!,
      document.text.indexOf('sum +'),
    );
    const lineHover = getRsxHoverAtPosition(
      service!,
      document.text.indexOf('line.lineTotal'),
    );
    const linesHover = getRsxHoverAtPosition(
      service!,
      document.text.indexOf('lines.reduce'),
    );

    expect(sumHover?.text).toContain('(parameter) sum: number');
    expect(lineHover?.text).toContain('(parameter) line:');
    expect(lineHover?.text).toContain('lineTotal');
    expect(linesHover?.text).toContain('model.lines:');
  });

  it('returns signature help for standalone .rsx call expressions', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const help = getRsxSignatureHelpAtPosition(
      service!,
      document.text.indexOf(', 0)') + 2,
    );

    expect(help).not.toBeNull();
    expect(help?.items.length).toBeGreaterThan(0);
    expect(help?.argumentIndex).toBeGreaterThanOrEqual(1);
    expect(help?.items[0]?.parameters[0]?.name).toBeTruthy();
  });

  it('resolves implementations from standalone .rsx files into implementing classes', () => {
    const text = readFileSync(implementationFixturePath, 'utf8');
    const service = createRsxStandaloneLanguageService({
      fileName: implementationFixturePath,
      text,
    });

    const implementations = getRsxImplementationsAtPosition(
      service!,
      text.indexOf('total') + 1,
    );
    const modelText = readFileSync(implementationModelFixturePath, 'utf8');
    const expectedStart = modelText.lastIndexOf('total(): number');

    expect(implementations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: implementationModelFixturePath,
          start: expectedStart,
          end: expectedStart + 'total'.length,
        }),
      ]),
    );
  });

  it('builds document symbols for rsx headers and body', () => {
    const document = createFixtureDocument();
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text: document.text,
    });

    const symbols = getRsxDocumentSymbols(service!);

    expect(symbols.map((symbol) => symbol.name)).toEqual([
      'model',
      'return',
      'expression',
    ]);
    expect(symbols[2]?.children.length).toBeGreaterThanOrEqual(0);
  });

  it('returns ts-backed quick fixes for standalone rsx diagnostics', () => {
    const text = [
      "model: import('./rsx-file-model.fixture').IModel",
      'return: number',
      '',
      'lines.reduce((sum, line) => sum + line.lineTotl, 0)',
      '',
    ].join('\n');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text,
    });
    const typoStart = text.indexOf('lineTotl');

    const fixes = getRsxCodeFixes({
      document: service!,
      start: typoStart,
      end: typoStart + 'lineTotl'.length,
    });

    expect(fixes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining('lineTotal'),
          edits: expect.arrayContaining([
            expect.objectContaining({
              fileName: rsxFixturePath,
              start: typoStart,
              end: typoStart + 'lineTotl'.length,
              newText: 'lineTotal',
            }),
          ]),
        }),
      ]),
    );
  });

  it('surfaces parser unsupported diagnostics for assignment expressions', () => {
    const text = [
      "model: import('./rsx-file-model.fixture').IModel",
      'return: boolean',
      '',
      'hazmat = false',
      '',
    ].join('\n');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text,
    });

    const diagnostics = getRsxDiagnostics(service!);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Assignment expressions are not supported',
        }),
      ]),
    );
  });

  it('surfaces parser unsupported diagnostics for other unsupported JS operators', () => {
    const text = [
      "model: import('./rsx-file-model.fixture').IModel",
      'return: boolean',
      '',
      'delete hazardCode',
      '',
    ].join('\n');
    const service = createRsxStandaloneLanguageService({
      fileName: rsxFixturePath,
      text,
    });

    const diagnostics = getRsxDiagnostics(service!);
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Delete operator is not supported',
        }),
      ]),
    );
  });
});

function createFixtureDocument(): { text: string } {
  return {
    text: readFileSync(rsxFixturePath, 'utf8'),
  };
}

function extractTopLevelModelPropertyNamesFromTypeText(
  typeText: string,
): string[] {
  const trimmed = typeText.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return [];
  }

  const body = trimmed.slice(1, -1);
  const segments: string[] = [];
  let segmentStart = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let angleDepth = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (character === '{') {
      braceDepth += 1;
      continue;
    }
    if (character === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (character === '[') {
      bracketDepth += 1;
      continue;
    }
    if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (character === '(') {
      parenDepth += 1;
      continue;
    }
    if (character === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (character === '<') {
      angleDepth += 1;
      continue;
    }
    if (character === '>') {
      angleDepth = Math.max(0, angleDepth - 1);
      continue;
    }

    const atTopLevel =
      braceDepth === 0 &&
      bracketDepth === 0 &&
      parenDepth === 0 &&
      angleDepth === 0;
    if (atTopLevel && (character === ';' || character === ',')) {
      segments.push(body.slice(segmentStart, index));
      segmentStart = index + 1;
    }
  }
  segments.push(body.slice(segmentStart));

  const names = new Set<string>();
  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) {
      continue;
    }

    const identifierMatch =
      /^(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)(?:\?)?\s*:/u.exec(segment);
    if (identifierMatch?.[1]) {
      names.add(identifierMatch[1]);
      continue;
    }

    const quotedMatch = /^(?:readonly\s+)?['"]([^'"]+)['"](?:\?)?\s*:/u.exec(
      segment,
    );
    if (
      quotedMatch?.[1] &&
      /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(quotedMatch[1])
    ) {
      names.add(quotedMatch[1]);
      continue;
    }

    return [];
  }

  return [...names];
}
