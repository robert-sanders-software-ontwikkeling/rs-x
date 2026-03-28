import type * as Monaco from 'monaco-editor';

import {
  findRsxExpressionLiteralRanges,
  tokenizeRsxExpression,
  type RsxTokenKind,
} from '@rs-x/compiler';

const tokenClassByKind: Record<RsxTokenKind, string> = {
  identifier: 'rsxExprIdentifier',
  keyword: 'rsxExprKeyword',
  number: 'rsxExprNumber',
  operator: 'rsxExprOperator',
  punctuation: 'rsxExprPunctuation',
  string: 'rsxExprString',
};

export function installRsxExpressionColorizer(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
): () => void {
  let decorationIds: string[] = [];

  const update = () => {
    const text = model.getValue();
    const ranges = findRsxExpressionLiteralRanges(text);
    const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

    for (const literalRange of ranges) {
      const tokens = tokenizeRsxExpression(literalRange.expression);
      for (const token of tokens) {
        decorations.push({
          range: new monaco.Range(
            model.getPositionAt(literalRange.start + token.start).lineNumber,
            model.getPositionAt(literalRange.start + token.start).column,
            model.getPositionAt(literalRange.start + token.end).lineNumber,
            model.getPositionAt(literalRange.start + token.end).column,
          ),
          options: {
            inlineClassName: tokenClassByKind[token.kind],
          },
        });
      }
    }

    decorationIds = model.deltaDecorations(decorationIds, decorations);
  };

  const sub = model.onDidChangeContent(update);
  update();

  return () => {
    sub.dispose();
    decorationIds = model.deltaDecorations(decorationIds, []);
  };
}
