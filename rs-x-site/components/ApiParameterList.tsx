import Link from 'next/link';

import { resolveTypeDocumentationLink } from '../lib/type-doc-links';

export type ApiParameterItem = {
  name: string;
  type: string;
  description: string;
  typeHref?: string;
};

type ApiParameterListProps = {
  items: ApiParameterItem[];
};

export function ApiParameterList({ items }: ApiParameterListProps) {
  if (items.length === 0) {
    return <p className='cardText'>No runtime parameters.</p>;
  }

  return (
    <div className='apiParamList'>
      {items.map((item) => (
        <article key={`${item.name}-${item.type}`} className='apiParamItem'>
          <div className='apiParamHead'>
            <span className='codeInline apiParamName'>{item.name}</span>
            {(() => {
              const resolvedHref = item.typeHref ?? resolveTypeDocumentationLink(item.type);
              if (!resolvedHref) {
                return <span className='codeInline apiParamType'>{item.type}</span>;
              }
              if (resolvedHref.startsWith('http')) {
                return (
                  <a
                    className='codeInline apiParamType'
                    href={resolvedHref}
                    target='_blank'
                    rel='noreferrer'
                  >
                    {item.type}
                  </a>
                );
              }
              return (
                <Link className='codeInline apiParamType' href={resolvedHref}>
                  {item.type}
                </Link>
              );
            })()}
          </div>
          <p className='apiParamDescription'>{item.description}</p>
        </article>
      ))}
    </div>
  );
}
