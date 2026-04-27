import type { IRsxExpressionMetadata } from './rsx-file';

export interface IRsxExpressionExport {
  readonly expression: IRsxExpressionMetadata;
  readonly exportName: string;
}

export function getRsxExpressionExports(args: {
  fileName: string;
  expressions: readonly IRsxExpressionMetadata[];
}): IRsxExpressionExport[] {
  const baseExportName = toRsxExportName(args.fileName);
  const usedExportNames = new Set<string>();

  return args.expressions.map((expression, index) => {
    const preferredName =
      expression.name ??
      (index === 0 ? baseExportName : `${baseExportName}${String(index + 1)}`);
    return {
      expression,
      exportName: ensureUniqueExportName(preferredName, usedExportNames),
    };
  });
}

export function toRsxExportName(fileName: string): string {
  const normalizedFileName = fileName.replace(/\\/gu, '/');
  const fileSegment = normalizedFileName.slice(
    normalizedFileName.lastIndexOf('/') + 1,
  );
  const baseName = fileSegment.endsWith('.rsx')
    ? fileSegment.slice(0, -'.rsx'.length)
    : fileSegment;
  const parts = baseName.split(/[^A-Za-z0-9_$]+/u).filter(Boolean);
  if (parts.length === 0) {
    return 'rsxExpression';
  }

  const [first, ...rest] = parts;
  const joined = [
    first.toLowerCase(),
    ...rest.map((part) => part[0].toUpperCase() + part.slice(1)),
  ].join('');

  return /^[A-Za-z_$]/u.test(joined) ? joined : `rsx${joined}`;
}

export function getRsxExpressionValueName(exportName: string): string {
  return exportName.endsWith('Rsx') && exportName.length > 'Rsx'.length
    ? exportName.slice(0, -'Rsx'.length)
    : exportName;
}

function ensureUniqueExportName(
  preferredName: string,
  usedExportNames: Set<string>,
): string {
  if (!usedExportNames.has(preferredName)) {
    usedExportNames.add(preferredName);
    return preferredName;
  }

  let suffix = 2;
  while (usedExportNames.has(`${preferredName}${String(suffix)}`)) {
    suffix += 1;
  }

  const uniqueName = `${preferredName}${String(suffix)}`;
  usedExportNames.add(uniqueName);
  return uniqueName;
}
