import ts from 'typescript';

import {
  defaultRsxSemanticTokenEmissionPolicy,
  hasOperatorLikePunctuation,
  isOperatorLikeTokenText,
  rsxSemanticTokenTypeIndexes,
  shouldEmitRsxSemanticToken,
  shouldEmitTsClassificationForRsxToken,
} from '../lib/language-service';

describe('rsx semantic token classification helpers', () => {
  it('detects pure operator token text using scanner-backed classification', () => {
    expect(isOperatorLikeTokenText('>')).toBe(true);
    expect(isOperatorLikeTokenText('>=')).toBe(true);
    expect(isOperatorLikeTokenText('&&')).toBe(true);
    expect(isOperatorLikeTokenText('a > b')).toBe(false);
    expect(isOperatorLikeTokenText("'>'")).toBe(false);
    expect(isOperatorLikeTokenText('/* > */')).toBe(false);
  });

  it('detects operator punctuation presence without false positives in strings/comments', () => {
    expect(hasOperatorLikePunctuation('a > b')).toBe(true);
    expect(hasOperatorLikePunctuation('(a + b)')).toBe(true);
    expect(hasOperatorLikePunctuation("'a>b'")).toBe(false);
    expect(hasOperatorLikePunctuation('/* >= */')).toBe(false);
    expect(hasOperatorLikePunctuation('identifierOnly')).toBe(false);
  });

  it('emits operator token emission by default', () => {
    expect(
      shouldEmitRsxSemanticToken({
        tokenType: rsxSemanticTokenTypeIndexes.operator,
        tokenText: '>',
      }),
    ).toBe(true);
    expect(
      shouldEmitTsClassificationForRsxToken({
        classification: ts.ClassificationType.operator,
        operatorClassification: ts.ClassificationType.operator,
      }),
    ).toBe(true);
  });

  it('allows non-operator semantic tokens with regular identifier text', () => {
    expect(
      shouldEmitRsxSemanticToken({
        tokenType: rsxSemanticTokenTypeIndexes.property,
        tokenText: 'lineTotal',
      }),
    ).toBe(true);
  });

  it('can opt out of operator token emission by policy', () => {
    const policy = {
      ...defaultRsxSemanticTokenEmissionPolicy,
      emitOperatorTokens: false,
    } as const;
    expect(
      shouldEmitRsxSemanticToken({
        tokenType: rsxSemanticTokenTypeIndexes.operator,
        tokenText: '>=',
        policy,
      }),
    ).toBe(false);
    expect(
      shouldEmitTsClassificationForRsxToken({
        classification: ts.ClassificationType.operator,
        operatorClassification: ts.ClassificationType.operator,
        policy,
      }),
    ).toBe(false);
  });
});
