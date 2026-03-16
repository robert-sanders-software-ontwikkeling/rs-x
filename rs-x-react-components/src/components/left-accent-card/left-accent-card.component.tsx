import React from 'react';

import './left-accent-card.component.css';

export type LeftAccentCardTone =
  | 'brand'
  | 'active'
  | 'done'
  | 'mostly'
  | 'planned';

type LeftAccentCardTag = 'article' | 'div' | 'li' | 'section';

export interface ILeftAccentCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: LeftAccentCardTag;
  tone?: LeftAccentCardTone;
}

function joinClassNames(classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export const LeftAccentCard: React.FC<ILeftAccentCardProps> = ({
  as = 'div',
  tone = 'brand',
  className,
  children,
  ...rest
}) => {
  const tagName = as;
  const classes = joinClassNames([
    'rsxLeftAccentCard',
    `rsxLeftAccentCard--${tone}`,
    className,
  ]);

  return React.createElement(
    tagName,
    {
      ...rest,
      className: classes,
    },
    children,
  );
};
