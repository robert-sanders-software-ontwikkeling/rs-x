import Link from 'next/link';
import { type ReactNode } from 'react';

import { resolveSymbolDocumentationLink } from '../../../lib/type-doc-links';

export function renderTypeWithLinks(
  type: string,
  currentSymbol?: string,
): ReactNode {
  const nodes: ReactNode[] = [];
  const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = identifierRe.exec(type)) !== null) {
    const [word] = match;
    const start = match.index;
    const end = start + word.length;

    if (start > lastIndex) {
      nodes.push(
        <span key={`type-txt-${lastIndex}`}>
          {type.slice(lastIndex, start)}
        </span>,
      );
    }

    const href = resolveSymbolDocumentationLink(word);
    if (href && word !== currentSymbol) {
      if (href.startsWith('http')) {
        nodes.push(
          <a
            key={`type-ext-${start}`}
            className="codeInline"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
      } else {
        nodes.push(
          <Link key={`type-lnk-${start}`} className="codeInline" href={href}>
            {word}
          </Link>,
        );
      }
    } else {
      nodes.push(
        <span key={`type-word-${start}`} className="codeInline">
          {word}
        </span>,
      );
    }

    lastIndex = end;
  }

  if (lastIndex < type.length) {
    nodes.push(
      <span key={`type-txt-end-${lastIndex}`}>{type.slice(lastIndex)}</span>,
    );
  }

  return nodes;
}
