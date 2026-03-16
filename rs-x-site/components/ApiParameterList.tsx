import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  resolveSymbolDocumentationLink,
  resolveTypeDocumentationLink,
} from '../lib/type-doc-links';

export type ApiParameterItem = {
  name: string;
  type: string;
  description: string;
  typeHref?: string;
};

type ApiParameterListProps = {
  items: ApiParameterItem[];
  currentSymbol?: string;
};

function renderLinkedText(
  text: string,
  currentSymbol?: string,
  className = '',
): ReactNode {
  const parts = text.split(/([A-Za-z_][A-Za-z0-9_]*)/g);

  return parts.map((part, index) => {
    const href = resolveSymbolDocumentationLink(part);
    if (!href || part === currentSymbol) {
      return (
        <span key={`txt-${index}`} className={className}>
          {part}
        </span>
      );
    }

    if (href.startsWith('http')) {
      return (
        <a
          key={`ext-${index}`}
          className={className}
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>
      );
    }

    return (
      <Link key={`lnk-${index}`} className={className} href={href}>
        {part}
      </Link>
    );
  });
}

export function ApiParameterList({
  items,
  currentSymbol,
}: ApiParameterListProps) {
  if (items.length === 0) {
    return <p className="cardText">No runtime parameters.</p>;
  }

  return (
    <div className="apiParamList">
      {items.map((item) => (
        <article key={`${item.name}-${item.type}`} className="apiParamItem">
          <div className="apiParamHead">
            <span className="apiParamName">
              {renderLinkedText(item.name, currentSymbol, 'codeInline')}
            </span>
            {(() => {
              const resolvedHref =
                item.typeHref ?? resolveTypeDocumentationLink(item.type);
              if (!resolvedHref) {
                return (
                  <span className="apiParamType">
                    {renderLinkedText(item.type, currentSymbol, 'codeInline')}
                  </span>
                );
              }
              if (resolvedHref.startsWith('http')) {
                return (
                  <a
                    className="codeInline apiParamType"
                    href={resolvedHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.type}
                  </a>
                );
              }
              return (
                <Link className="codeInline apiParamType" href={resolvedHref}>
                  {item.type}
                </Link>
              );
            })()}
          </div>
          <p className="apiParamDescription">
            {renderLinkedText(item.description, currentSymbol)}
          </p>
        </article>
      ))}
    </div>
  );
}
