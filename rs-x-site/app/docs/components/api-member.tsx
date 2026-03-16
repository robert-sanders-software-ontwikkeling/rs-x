import fs from 'node:fs/promises';
import path from 'node:path';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { type ApiParameterItem } from '../../../components/ApiParameterList';

import { renderTypeWithLinks } from './render-type-with-links';
import { splitTopLevelCommaList } from './split-top-level-comma-list';

export interface ApiItem {
  symbol: string;
  kind: string;
  module: string;
  description: string;
  sourcePath: string;
  signature: string;
}

export type SymbolDocumentation = {
  summary?: string;
  parameters?: ApiParameterItem[];
  returns?: string;
  notes?: string;
  exampleCode?: string;
  constructorInjectionExampleCode?: string;
  fullSignature?: string;
  hideModuleDetail?: boolean;
};

export type ApiMemberParameter = {
  name: string;
  type: string;
  optional: boolean;
  rest: boolean;
};

export type ApiMember = {
  name: string;
  kind: 'method' | 'property' | 'constructor' | 'index' | 'call';
  signature: string;
  parameters: ApiMemberParameter[];
  returnType?: string;
  optional: boolean;
  readonly: boolean;
  abstract: boolean;
  access?: 'public' | 'protected';
  description: string;
};

export interface IQuickFact {
  label: string;
  fact: ReactNode | string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interfaceBody(declaration: string): string {
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString: '"' | "'" | '`' | null = null;

  for (let index = 0; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > 0 ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return '';
  }

  let closeBraceIndex = -1;
  let braceDepth = 0;
  inString = null;
  for (let index = openBraceIndex; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > openBraceIndex ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex <= openBraceIndex) {
    return '';
  }

  return declaration.slice(openBraceIndex + 1, closeBraceIndex);
}

function splitInterfaceStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const prev = index > 0 ? body[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    statements.push(last);
  }

  return statements;
}

function splitClassStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    if (
      char === '{' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const header = current.trim();
      if (header && header.includes('(')) {
        statements.push(header);
      }
      current = '';
      braceDepth = 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      continue;
    }

    if (braceDepth === 0) {
      current += char;
    }
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

function splitTopLevelCsv(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let angleDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index > 0 ? value[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }
    if (char === '<') {
      angleDepth += 1;
    }
    if (char === '>') {
      angleDepth -= 1;
    }

    if (
      char === ',' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      angleDepth === 0
    ) {
      const part = current.trim();
      if (part) {
        parts.push(part);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

export function groupMembers(
  members: ApiMember[],
): Array<{ kind: ApiMember['kind']; members: ApiMember[] }> {
  const order: ApiMember['kind'][] = [
    'constructor',
    'property',
    'method',
    'index',
    'call',
  ];
  return order
    .map((kind) => ({
      kind,
      members: members.filter((member) => member.kind === kind),
    }))
    .filter((group) => group.members.length > 0);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSignature(value: string): string {
  return normalizeWhitespace(value).replace(/,\s*\)/g, ')');
}

function memberSortName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/[?()[\]]/g, '')
    .trim()
    .toLowerCase();
}

function formatMemberLabel(name: string): string {
  const normalized = plainMemberName(name).replace(/^_+/, '');
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function joinParamNames(parameters: ApiMemberParameter[]): string {
  const names = parameters.map((item) => item.name.replace(/^\.\.\./, ''));
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export function memberKindRank(kind: ApiMember['kind']): number {
  if (kind === 'constructor') {
    return 0;
  }
  if (kind === 'property') {
    return 1;
  }
  if (kind === 'method') {
    return 2;
  }
  if (kind === 'index') {
    return 3;
  }
  return 4;
}

export function memberAccessRank(access?: ApiMember['access']): number {
  if (access === 'public') {
    return 0;
  }
  if (access === 'protected') {
    return 1;
  }
  return 2;
}

export function parseMethodParameters(params: string): ApiMemberParameter[] {
  const cleaned = params.trim();
  if (!cleaned) {
    return [];
  }

  return splitTopLevelCsv(cleaned).map((rawParam) => {
    let normalized = rawParam.trim();
    normalized = normalized.replace(/^@\w+(?:\([^)]*\))?\s*/g, '');
    normalized = normalized.replace(
      /^(?:(?:public|private|protected|readonly|override)\s+)+/,
      '',
    );
    const match = normalized.match(
      /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*[\s\S]+)?$/,
    );
    if (match) {
      const [, rest, name, optionalMark, explicitType] = match;
      const hasDefaultValue = /\s=\s/.test(normalized);
      const normalizedType = explicitType?.trim() || 'unknown';
      return {
        name: `${rest ?? ''}${name}`,
        type: normalizedType,
        optional: optionalMark === '?' || hasDefaultValue,
        rest: Boolean(rest),
      };
    }

    return {
      name: normalized,
      type: 'unknown',
      optional: false,
      rest: false,
    };
  });
}

export function plainMemberName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/\?$/, '')
    .trim();
}

export function extractBaseClassName(
  kind: string,
  declaration: string,
): string | null {
  if (!['class', 'abstract class'].includes(kind)) {
    return null;
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return null;
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const extendsMatch = heritage.match(
    /\bextends\s+([\s\S]*?)(?:\bimplements\b|$)/,
  );
  if (!extendsMatch) {
    return null;
  }

  const baseClass = extendsMatch[1]?.trim();
  return baseClass && baseClass.length > 0 ? baseClass : null;
}

export function extractImplementedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (!['class', 'abstract class'].includes(kind)) {
    return [];
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const implementsMatch = heritage.match(/\bimplements\s+([\s\S]*)$/);
  if (!implementsMatch) {
    return [];
  }

  return splitTopLevelCommaList(implementsMatch[1]);
}

export function extractExtendedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (kind !== 'interface') {
    return [];
  }

  const headerMatch = declaration.match(
    /interface\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*extends\s+([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  return splitTopLevelCommaList(headerMatch[1]);
}

export function buildMemberDescription(
  symbolName: string,
  kind: ApiMember['kind'],
  name: string,
  returnType: string | undefined,
  parameters: ApiMemberParameter[],
  optional: boolean,
  readonly: boolean,
  MEMBER_DESCRIPTION_OVERRIDES: Record<string, Record<string, string>>,
): string {
  const baseName = plainMemberName(name);
  const symbolOverrides = MEMBER_DESCRIPTION_OVERRIDES[symbolName];
  const override =
    symbolOverrides &&
    Object.prototype.hasOwnProperty.call(symbolOverrides, baseName)
      ? symbolOverrides[baseName]
      : undefined;
  if (override) {
    return override;
  }
  const memberLabel = formatMemberLabel(baseName);
  const paramList = joinParamNames(parameters);

  if (baseName === 'except') {
    return 'Transforms the source value during clone and returns the value that should be written into the cloned object.';
  }

  if (baseName === 'clone') {
    return 'Creates a cloned value from the source input using the runtime clone strategy.';
  }

  if (baseName === 'dispose') {
    return 'Releases resources, subscriptions, and internal state held by this instance. Always call `dispose()` when you are finished, to prevent memory leaks.';
  }

  if (kind === 'property') {
    const readonlyNote = readonly ? 'Read-only.' : '';
    const optionalNote = optional ? 'Optional.' : '';
    const typeNote = returnType ? `Type: \`${returnType}\`.` : '';
    return [
      `Represents the \`${memberLabel || baseName}\` value on this API.`,
      readonlyNote,
      optionalNote,
      typeNote,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (kind === 'method') {
    const inputNote =
      parameters.length > 0
        ? `Accepts ${parameters.length === 1 ? 'parameter' : 'parameters'} ${paramList}.`
        : 'Takes no parameters.';
    const returnNote = returnType ? `Returns \`${returnType}\`.` : '';

    if (/^get[A-Z_]/.test(baseName)) {
      return `Reads ${memberLabel.replace(/^get\s+/, '') || 'a value'} from the runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (/^set[A-Z_]/.test(baseName)) {
      return `Updates ${memberLabel.replace(/^set\s+/, '') || 'a value'} on the runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (
      /^is[A-Z_]/.test(baseName) ||
      /^has[A-Z_]/.test(baseName) ||
      /^can[A-Z_]/.test(baseName)
    ) {
      return `Checks whether ${memberLabel} is true. ${inputNote} ${returnNote}`.trim();
    }
    if (/^assert[A-Z_]/.test(baseName)) {
      return `Validates ${memberLabel.replace(/^assert\s+/, '') || 'the condition'}. Throws when validation fails. ${inputNote} ${returnNote}`.trim();
    }
    if (/^create[A-Z_]/.test(baseName)) {
      return `Creates ${memberLabel.replace(/^create\s+/, '') || 'an instance'}. ${inputNote} ${returnNote}`.trim();
    }
    if (/^register[A-Z_]/.test(baseName)) {
      return `Registers ${memberLabel.replace(/^register\s+/, '') || 'a dependency'} in the runtime registry. ${inputNote} ${returnNote}`.trim();
    }
    if (/^bind[A-Z_]/.test(baseName)) {
      return `Binds ${memberLabel.replace(/^bind\s+/, '') || 'state'} into the current expression context. ${inputNote} ${returnNote}`.trim();
    }
    if (/^watch[A-Z_]/.test(baseName) || /^observe[A-Z_]/.test(baseName)) {
      return `Subscribes to ${memberLabel.replace(/^(watch|observe)\s+/, '') || 'changes'} and hooks it into the update pipeline. ${inputNote} ${returnNote}`.trim();
    }

    return `Performs \`${memberLabel || baseName}\`. ${inputNote} ${returnNote}`.trim();
  }

  if (kind === 'constructor') {
    return '';
  }

  if (kind === 'index') {
    return returnType
      ? `Allows keyed access and resolves values as type \`${returnType}\`.`
      : 'Allows keyed access on this type.';
  }

  return returnType
    ? `This type can be called like a function and returns \`${returnType}\`.`
    : 'This type can be called like a function.';
}

export function parseDeclarationMembers(
  declaration: string,
  symbolName: string,
  memberDescriptionOverrides: Record<string, Record<string, string>>,
): ApiMember[] {
  const body = interfaceBody(declaration);
  if (!body) {
    return [];
  }

  const isClassDeclaration = /^export\s+(?:abstract\s+)?class\b/.test(
    declaration,
  );
  const statements = isClassDeclaration
    ? splitClassStatements(body)
    : splitInterfaceStatements(body);
  const members: ApiMember[] = [];
  const resolveAccess = (
    modifiers: string,
  ): 'public' | 'protected' | undefined => {
    if (!isClassDeclaration) {
      return undefined;
    }
    if (/\bprotected\b/.test(modifiers)) {
      return 'protected';
    }
    return 'public';
  };

  for (const statement of statements) {
    const cleaned = normalizeSignature(statement);
    if (!cleaned) {
      continue;
    }

    const indexMatch = cleaned.match(/^\[([^\]]+)\]\s*:\s*(.+)$/);
    if (indexMatch) {
      members.push({
        name: `[${indexMatch[1]}]`,
        kind: 'index',
        signature: cleaned,
        parameters: [],
        returnType: indexMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'index',
          `[${indexMatch[1]}]`,
          indexMatch[2],
          [],
          false,
          false,
          memberDescriptionOverrides,
        ),
      });
      continue;
    }

    const methodMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract|readonly|async|override)\s+)*)(constructor|[A-Za-z_$][\w$]*)(?:<[\s\S]+>)?(\?)?\s*\((.*)\)\s*(?::\s*(.+))?$/,
    );
    if (methodMatch) {
      const [, modifiers, name, optionalMark, params, rawReturnType] =
        methodMatch;
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const optional = optionalMark === '?';
      const isConstructor = name === 'constructor';
      const returnType = isConstructor
        ? undefined
        : (rawReturnType?.trim() ?? 'void');
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);
      members.push({
        name: optional ? `${name}?` : name,
        kind: isConstructor ? 'constructor' : 'method',
        signature: cleaned,
        parameters: parseMethodParameters(params),
        returnType,
        optional,
        readonly: false,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          isConstructor ? 'constructor' : 'method',
          optional ? `${name}?` : name,
          returnType,
          parseMethodParameters(params),
          optional,
          false,
          memberDescriptionOverrides,
        ),
      });
      continue;
    }

    const callSignatureMatch = cleaned.match(/^\((.*)\)\s*:\s*(.+)$/);
    if (callSignatureMatch) {
      members.push({
        name: '(call)',
        kind: 'call',
        signature: cleaned,
        parameters: parseMethodParameters(callSignatureMatch[1]),
        returnType: callSignatureMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'call',
          '(call)',
          callSignatureMatch[2],
          parseMethodParameters(callSignatureMatch[1]),
          false,
          false,
          memberDescriptionOverrides,
        ),
      });
      continue;
    }

    const propertyMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract)\s+)*)(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/,
    );
    if (propertyMatch) {
      const modifiers = propertyMatch[1];
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const readonly = Boolean(propertyMatch[2]);
      const name = propertyMatch[3];
      const optional = propertyMatch[4] === '?';
      const type = propertyMatch[5];
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);
      members.push({
        name: `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
        kind: 'property',
        signature: cleaned,
        parameters: [],
        returnType: type,
        optional,
        readonly,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          'property',
          `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
          type,
          [],
          optional,
          readonly,
          memberDescriptionOverrides,
        ),
      });
    }
  }

  return members.sort((left, right) => {
    const kindDiff = memberKindRank(left.kind) - memberKindRank(right.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }
    const accessDiff =
      memberAccessRank(left.access) - memberAccessRank(right.access);
    if (accessDiff !== 0) {
      return accessDiff;
    }
    return memberSortName(left.name).localeCompare(memberSortName(right.name));
  });
}

export async function readFullTypeDeclaration(
  packageName: string,
  symbol: string,
  sourcePath: string,
  kind: string,
): Promise<string | null> {
  const filePath = path.resolve(
    process.cwd(),
    `../${packageName}/lib`,
    sourcePath,
  );
  const fileContent = await fs.readFile(filePath, 'utf8');

  if (kind === 'type') {
    const typeRegex = new RegExp(`export\\s+type\\s+${escapeRegex(symbol)}\\b`);
    const typeMatch = typeRegex.exec(fileContent);
    if (!typeMatch) {
      return null;
    }

    const start = typeMatch.index;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = start; i < fileContent.length; i += 1) {
      const char = fileContent[i];
      const next = fileContent[i + 1];

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          i += 1;
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        inLineComment = true;
        i += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '(') {
        parenDepth += 1;
      } else if (char === ')' && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === '[') {
        bracketDepth += 1;
      } else if (char === ']' && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === '{') {
        braceDepth += 1;
      } else if (char === '}' && braceDepth > 0) {
        braceDepth -= 1;
      } else if (char === '<') {
        angleDepth += 1;
      } else if (char === '>' && angleDepth > 0) {
        angleDepth -= 1;
      }

      if (
        char === ';' &&
        parenDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0 &&
        angleDepth === 0
      ) {
        return fileContent.slice(start, i + 1).trim();
      }
    }

    return fileContent.slice(start).trim();
  }

  const declarationRegexByKind: Record<string, RegExp> = {
    interface: new RegExp(`export\\s+interface\\s+${escapeRegex(symbol)}\\b`),
    class: new RegExp(`export\\s+class\\s+${escapeRegex(symbol)}\\b`),
    'abstract class': new RegExp(
      `export\\s+abstract\\s+class\\s+${escapeRegex(symbol)}\\b`,
    ),
  };
  const declarationRegex = declarationRegexByKind[kind];
  if (!declarationRegex) {
    return null;
  }
  const match = declarationRegex.exec(fileContent);
  if (!match) {
    return null;
  }

  const start = match.index;
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inHeaderString: '"' | "'" | '`' | null = null;
  let inHeaderLineComment = false;
  let inHeaderBlockComment = false;
  let headerEscaped = false;

  for (let index = start; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inHeaderLineComment) {
      if (char === '\n') {
        inHeaderLineComment = false;
      }
      continue;
    }

    if (inHeaderBlockComment) {
      if (char === '*' && next === '/') {
        inHeaderBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inHeaderString) {
      if (headerEscaped) {
        headerEscaped = false;
        continue;
      }
      if (char === '\\') {
        headerEscaped = true;
        continue;
      }
      if (char === inHeaderString) {
        inHeaderString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inHeaderLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inHeaderBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inHeaderString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  let closeBraceIndex = -1;
  for (let index = openBraceIndex; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex < 0) {
    return null;
  }

  return fileContent.slice(start, closeBraceIndex + 1).trim();
}

function renderTypeListWithLinks(
  types: string[],
  currentSymbol?: string,
): ReactNode {
  return types.flatMap((item, index) => {
    const nodes: ReactNode[] = [];
    if (index > 0) {
      nodes.push(<span key={`type-sep-${index}`}>, </span>);
    }
    nodes.push(
      <span key={`type-item-${index}`}>
        {renderTypeWithLinks(item, currentSymbol)}
      </span>,
    );
    return nodes;
  });
}

export function createQuickFacts(
  entry: ApiItem,
  memberDocs: ApiMember[],
  apiSignature: string,
  moduleHref: string,
  moduleLabel: string,
  CORE_GITHUB_BASE: string,
): IQuickFact[] {
  const baseClassName = extractBaseClassName(entry.kind, apiSignature);
  const extendedInterfaces = extractExtendedInterfaces(
    entry.kind,
    apiSignature,
  );
  const implementedInterfaces = extractImplementedInterfaces(
    entry.kind,
    apiSignature,
  );

  const supportsMembers = ['interface', 'class', 'abstract class'].includes(
    entry.kind,
  );

  const quikFacts: IQuickFact[] = [
    {
      label: 'Kind',
      fact: entry.kind,
    },
    {
      label: 'Module',
      fact: <Link href={moduleHref}>{moduleLabel}</Link>,
    },
  ];

  if (baseClassName) {
    quikFacts.push({
      label: 'Base class',
      fact: renderTypeWithLinks(baseClassName, entry.symbol),
    });
  }

  if (extendedInterfaces.length > 0) {
    quikFacts.push({
      label: 'Extends',
      fact: renderTypeListWithLinks(extendedInterfaces, entry.symbol),
    });
  }

  if (implementedInterfaces.length > 0) {
    quikFacts.push({
      label: 'Implements',
      fact: renderTypeListWithLinks(implementedInterfaces, entry.symbol),
    });
  }

  if (supportsMembers && memberDocs.length > 0) {
    quikFacts.push({
      label: 'Members',
      fact: memberDocs.length,
    });
  }

  quikFacts.push({
    label: 'Package',
    fact: (
      <Link
        href="https://www.npmjs.com/package/@rs-x/core"
        target="_blank"
        rel="noreferrer"
      >
        @rs-x/core
      </Link>
    ),
  });

  quikFacts.push({
    label: 'Source',
    fact: (
      <a
        href={`${CORE_GITHUB_BASE}/${entry.sourcePath}`}
        target="_blank"
        rel="noreferrer"
      >
        {entry.sourcePath}
      </a>
    ),
  });

  return quikFacts;
}
