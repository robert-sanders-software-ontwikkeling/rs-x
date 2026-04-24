import { readFileSync } from 'node:fs';
import path from 'node:path';

const extensionRoot = path.resolve(__dirname, '..');

describe('rsx grammar scopes', () => {
  it.each([
    ['standalone .rsx grammar', 'syntaxes/rsx-file.language.json'],
    [
      'inline rsx(...) injection grammar',
      'syntaxes/rsx-expression.injection.json',
    ],
  ])(
    '%s assigns symbolic operators to a private non-operator scope',
    (_label, grammarPath) => {
      const grammar = JSON.parse(
        readFileSync(path.join(extensionRoot, grammarPath), 'utf8'),
      ) as {
        repository?: {
          operators?: {
            patterns?: Array<{ name?: string; match?: string }>;
          };
        };
      };

      const operatorPattern = grammar.repository?.operators?.patterns?.[0];

      expect(operatorPattern?.name).toBe('meta.rsx.symbol');
      expect(operatorPattern?.match).toEqual(expect.stringContaining('<'));
      expect(operatorPattern?.match).toEqual(expect.stringContaining('>'));
      expect(operatorPattern?.name).not.toContain('keyword');
      expect(operatorPattern?.name).not.toContain('operator');
      expect(operatorPattern?.name).not.toContain('punctuation');
      expect(operatorPattern?.name).not.toContain('separator');
    },
  );

  it('does not declare rsx expression regions as embedded TypeScript', () => {
    const manifest = JSON.parse(
      readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'),
    ) as {
      contributes?: {
        grammars?: Array<{
          scopeName?: string;
          embeddedLanguages?: Record<string, string>;
        }>;
      };
    };

    const grammars = manifest.contributes?.grammars ?? [];
    const rsxFileGrammar = grammars.find(
      (grammar) => grammar.scopeName === 'source.rsx',
    );
    const inlineGrammar = grammars.find(
      (grammar) => grammar.scopeName === 'rsx.expression.injection',
    );

    expect(rsxFileGrammar?.embeddedLanguages).toBeUndefined();
    expect(inlineGrammar?.embeddedLanguages).toBeUndefined();
  });
});
