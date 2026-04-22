import path from 'node:path';
import { readFileSync } from 'node:fs';

import {
  getRsxCodeFixes,
  createRsxStandaloneLanguageService,
  getRsxDefinitionsAtPosition,
  getRsxDocumentSymbols,
  getRsxImplementationsAtPosition,
  getRsxReferencesAtPosition,
  getRsxRenameLocationsAtPosition,
  getRsxSemanticTokens,
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
});

function createFixtureDocument(): { text: string } {
  return {
    text: readFileSync(rsxFixturePath, 'utf8'),
  };
}
