import type ts from 'typescript/lib/tsserverlibrary';

export function getEncodedLexicalClassificationsForRsxExpression(args: {
  ts: typeof ts;
  expressionText: string;
}): { spans: number[]; endOfLineState: ts.EndOfLineState } {
  const { ts, expressionText } = args;
  const classifier = ts.createClassifier();

  return classifier.getEncodedLexicalClassifications(
    expressionText,
    ts.EndOfLineState.None,
    true,
  );
}

export function excludeClassificationSpansInRanges(
  spans: number[],
  ranges: ReadonlyArray<{ start: number; end: number }>,
): number[] {
  if (spans.length === 0 || ranges.length === 0) {
    return [...spans];
  }

  const normalizedRanges = [...ranges].sort(
    (left, right) => left.start - right.start,
  );
  const result: number[] = [];

  for (let index = 0; index < spans.length; index += 3) {
    const start = spans[index];
    const end = start + spans[index + 1];
    const classification = spans[index + 2];
    let segments = [{ start, end }];

    for (const range of normalizedRanges) {
      if (range.end <= start || range.start >= end) {
        continue;
      }

      const nextSegments: Array<{ start: number; end: number }> = [];
      for (const segment of segments) {
        if (range.end <= segment.start || range.start >= segment.end) {
          nextSegments.push(segment);
          continue;
        }

        if (range.start > segment.start) {
          nextSegments.push({ start: segment.start, end: range.start });
        }
        if (range.end < segment.end) {
          nextSegments.push({ start: range.end, end: segment.end });
        }
      }
      segments = nextSegments;
      if (segments.length === 0) {
        break;
      }
    }

    for (const segment of segments) {
      if (segment.end <= segment.start) {
        continue;
      }

      result.push(segment.start, segment.end - segment.start, classification);
    }
  }

  return result;
}
