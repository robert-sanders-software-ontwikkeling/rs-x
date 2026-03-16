import Link from 'next/link';
import React, { type ReactNode } from 'react';

export interface IWhenToUse {
  description: ReactNode;
  related: { href: string; label: string }[];
}

export const WhenToUse: React.FC<IWhenToUse> = ({ description, related }) => {
  return (
    <article id="usage" className="card docsApiCard">
      <h2 className="cardTitle">When to use</h2>
      <p className="cardText">{description}</p>

      {related.length > 0 && (
        <p className="cardText">
          Related:{' '}
          {related.map((item, index) => (
            <span key={item.href}>
              {index > 0 ? ', ' : ''}
              <Link href={item.href}>{item.label}</Link>
            </span>
          ))}
        </p>
      )}
    </article>
  );
};
