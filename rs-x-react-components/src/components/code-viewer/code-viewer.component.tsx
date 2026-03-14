'use client';

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import './code-viewer.component.css';

type TokenKind =
  | 'keyword'
  | 'type'
  | 'literal'
  | 'number'
  | 'string'
  | 'comment'
  | 'operator'
  | 'identifier';

interface IToken {
  kind: TokenKind;
  value: string;
}

const KEYWORDS = new Set([
  'as',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'of',
  'override',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'static',
  'super',
  'switch',
  'throw',
  'try',
  'type',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const TYPE_KEYWORDS = new Set([
  'AbstractExpression',
  'Array',
  'ChangeHook',
  'Disposable',
  'ExpressionType',
  'IExpression',
  'IExpressionBindConfiguration',
  'IExpressionChangeTrackerManager',
  'IExpressionChangeTransactionManager',
  'IDisposable',
  'Map',
  'Observable',
  'Promise',
  'Record',
  'Set',
  'Symbol',
  'boolean',
  'never',
  'number',
  'object',
  'string',
  'unknown',
]);

const LITERALS = new Set(['true', 'false', 'null', 'undefined']);

const IDENTIFIER_RE = /[A-Za-z_$][A-Za-z0-9_$]*/y;
const NUMBER_RE = /(?:\d+\.?\d*|\.?\d+)(?:[eE][+-]?\d+)?n?/y;
const TWO_CHAR_OPERATORS = new Set([
  '=>',
  '==',
  '!=',
  '>=',
  '<=',
  '&&',
  '||',
  '??',
  '+=',
  '-=',
  '*=',
  '/=',
  '?.',
  '::',
]);
const THREE_CHAR_OPERATORS = new Set(['===', '!==', '>>>', '<<=', '>>=']);

const DEFAULT_COLLAPSED_LINE_COUNT = 22;

function joinClassNames(
  classes: Array<string | undefined | false>,
): string | undefined {
  const joined = classes.filter(Boolean).join(' ');
  return joined.length > 0 ? joined : undefined;
}

function tokenize(code: string): IToken[] {
  const tokens: IToken[] = [];
  let i = 0;

  while (i < code.length) {
    const char = code[i];

    if (char === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const value = end === -1 ? code.slice(i) : code.slice(i, end);
      tokens.push({ kind: 'comment', value });
      i += value.length;
      continue;
    }

    if (char === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const value = end === -1 ? code.slice(i) : code.slice(i, end + 2);
      tokens.push({ kind: 'comment', value });
      i += value.length;
      continue;
    }

    if (char === "'" || char === '"' || char === '`') {
      const quote = char;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      tokens.push({ kind: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    IDENTIFIER_RE.lastIndex = i;
    const idMatch = IDENTIFIER_RE.exec(code);
    if (idMatch) {
      const value = idMatch[0];
      let kind: TokenKind = 'identifier';
      if (KEYWORDS.has(value)) {
        kind = 'keyword';
      } else if (TYPE_KEYWORDS.has(value)) {
        kind = 'type';
      } else if (LITERALS.has(value)) {
        kind = 'literal';
      }
      tokens.push({ kind, value });
      i += value.length;
      continue;
    }

    NUMBER_RE.lastIndex = i;
    const numberMatch = NUMBER_RE.exec(code);
    if (numberMatch) {
      const value = numberMatch[0];
      tokens.push({ kind: 'number', value });
      i += value.length;
      continue;
    }

    const two = code.slice(i, i + 2);
    const three = code.slice(i, i + 3);
    if (TWO_CHAR_OPERATORS.has(two)) {
      tokens.push({ kind: 'operator', value: two });
      i += 2;
      continue;
    }

    if (THREE_CHAR_OPERATORS.has(three)) {
      tokens.push({ kind: 'operator', value: three });
      i += 3;
      continue;
    }

    if ('{}[]().,;:+-*/%<>=!&|?^~'.includes(char)) {
      tokens.push({ kind: 'operator', value: char });
      i += 1;
      continue;
    }

    tokens.push({ kind: 'identifier', value: char });
    i += 1;
  }

  return tokens;
}

function renderCodeLines(code: string): ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const lineTokens = tokenize(line);
    const rendered: ReactElement[] = lineTokens.map((token, tokenIndex) => (
      <span key={`${lineIndex}-${tokenIndex}`} className={`tok tok-${token.kind}`}>
        {token.value}
      </span>
    ));

    if (lineIndex === lines.length - 1) {
      return <span key={`line-${lineIndex}`}>{rendered}</span>;
    }

    return (
      <span key={`line-${lineIndex}`}>
        {rendered}
        {'\n'}
      </span>
    );
  });
}

export interface ICodeViewerProps {
  code: string;
  className?: string;
  style?: CSSProperties;
  containerClassName?: string;
  codeClassName?: string;
  actionsClassName?: string;
  toggleButtonClassName?: string;
  collapsedLineCount?: number;
  expandable?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
}

export const CodeViewer: React.FC<ICodeViewerProps> = ({
  code,
  className,
  style,
  containerClassName,
  codeClassName = 'syntaxCode',
  actionsClassName,
  toggleButtonClassName,
  collapsedLineCount = DEFAULT_COLLAPSED_LINE_COUNT,
  expandable = true,
  expandLabel = 'Show full code',
  collapseLabel = 'Collapse code',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const lines = useMemo(() => code.split('\n'), [code]);
  const canExpand = expandable && lines.length > collapsedLineCount;

  useEffect(() => {
    setIsExpanded(false);
  }, [code]);

  const visibleCode =
    canExpand && !isExpanded
      ? lines.slice(0, collapsedLineCount).join('\n')
      : code;

  const preClassName = joinClassNames(['rsxCodeViewerPre', className]);
  const resolvedCodeClassName = joinClassNames([
    'rsxCodeViewerSyntax',
    codeClassName,
  ]);
  const resolvedActionClassName = joinClassNames([
    'rsxCodeViewerActions',
    actionsClassName,
  ]);
  const resolvedToggleClassName = joinClassNames([
    'rsxCodeViewerToggle',
    toggleButtonClassName,
  ]);

  const preElement = (
    <pre className={preClassName} style={style}>
      <code className={resolvedCodeClassName}>{renderCodeLines(visibleCode)}</code>
    </pre>
  );

  if (!canExpand && !containerClassName) {
    return preElement;
  }

  return (
    <div className={joinClassNames(['rsxCodeViewer', containerClassName])}>
      {preElement}
      {canExpand ? (
        <div className={resolvedActionClassName}>
          <button
            type="button"
            className={resolvedToggleClassName}
            onClick={() => {
              setIsExpanded((value) => !value);
            }}
          >
            {isExpanded ? collapseLabel : expandLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};
