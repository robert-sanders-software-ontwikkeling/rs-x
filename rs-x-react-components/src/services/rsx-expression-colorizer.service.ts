import type * as Monaco from 'monaco-editor';

import {
  findRsxExpressionLiteralRanges,
  type RsxTokenKind,
  tokenizeRsxExpression,
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
  let disposed = false;

  const isModelDisposed = () => {
    return (
      disposed || (typeof model.isDisposed === 'function' && model.isDisposed())
    );
  };

  const update = () => {
    if (isModelDisposed()) {
      return;
    }

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

    if (isModelDisposed()) {
      return;
    }

    decorationIds = model.deltaDecorations(decorationIds, decorations);
  };

  const sub = model.onDidChangeContent(update);
  update();

  return () => {
    disposed = true;
    sub.dispose();
    if (!isModelDisposed()) {
      decorationIds = model.deltaDecorations(decorationIds, []);
    }
  };
}
