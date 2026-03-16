import React, { type ReactNode } from 'react';

export interface ICardProps {
  id?: string;
  header: string;
  children: ReactNode;
}

export const Card: React.FC<ICardProps> = ({ children, id, header }) => {
  return (
    <article id={id} className="card docsApiCard">
      <h2 className="cardTitle">{header}</h2>
      <div className="cardText">{children}</div>
    </article>
  );
};
