import type {
  IRsxSemanticClassificationContext,
  IRsxToken,
} from '@rs-x/compiler';
import {
  createRsxSemanticClassificationContext,
  resolveRsxSemanticTokenType,
  resolveRsxSemanticTokenTypeForIdentifier,
  rsxSemanticTokenTypeIndexes,
} from '@rs-x/compiler';

export { createRsxSemanticClassificationContext };
export type { IRsxSemanticClassificationContext };

export const RSX_SEMANTIC_TOKEN_TYPE = {
  parameter: rsxSemanticTokenTypeIndexes.parameter,
  variable: rsxSemanticTokenTypeIndexes.variable,
  property: rsxSemanticTokenTypeIndexes.property,
  function: rsxSemanticTokenTypeIndexes.function,
  keyword: rsxSemanticTokenTypeIndexes.keyword,
  string: rsxSemanticTokenTypeIndexes.string,
  number: rsxSemanticTokenTypeIndexes.number,
  operator: rsxSemanticTokenTypeIndexes.operator,
} as const;

export function resolveSemanticTokenTypeForIdentifier(args: {
  context: IRsxSemanticClassificationContext;
  text: string;
  token: IRsxToken;
}): number {
  return resolveRsxSemanticTokenTypeForIdentifier(args);
}

export function resolveSemanticTokenType(args: {
  context: IRsxSemanticClassificationContext;
  text: string;
  token: IRsxToken;
}): number | null {
  return resolveRsxSemanticTokenType(args);
}
