import ts from 'typescript';

import {
  excludeClassificationSpansInRanges,
  getEncodedLexicalClassificationsForRsxExpression,
} from '../lib/rsx-syntactic-classification';

describe('rsx syntactic classification', () => {
  it('matches TypeScript lexical classifications for a full embedded expression', () => {
    const expression =
      'lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0)';
    const classifier = ts.createClassifier();
    const expected = classifier.getEncodedLexicalClassifications(
      expression,
      ts.EndOfLineState.None,
      true,
    );

    const actual = getEncodedLexicalClassificationsForRsxExpression({
      ts,
      expressionText: expression,
    });

    expect(actual).toEqual(expected);
  });

  it('matches TypeScript lexical classifications for the whole expression with strings and conditionals', () => {
    const expression =
      "country === 'NL' ? shippingMethod.toUpperCase() : `zone-${cart[0].qty}`";
    const classifier = ts.createClassifier();
    const expected = classifier.getEncodedLexicalClassifications(
      expression,
      ts.EndOfLineState.None,
      true,
    );

    const actual = getEncodedLexicalClassificationsForRsxExpression({
      ts,
      expressionText: expression,
    });

    expect(actual).toEqual(expected);
  });

  it('removes base string classifications only inside embedded expression ranges', () => {
    const spans = [0, 4, 1, 4, 10, 2, 14, 6, 3];

    expect(
      excludeClassificationSpansInRanges(spans, [{ start: 5, end: 12 }]),
    ).toEqual([0, 4, 1, 4, 1, 2, 12, 2, 2, 14, 6, 3]);
  });
});
