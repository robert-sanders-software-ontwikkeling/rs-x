import type { ReactNode } from 'react';
import React from 'react';

export interface IItemLinkCardContentProps {
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  arrow?: ReactNode;
  titleClassName?: string;
  metaClassName?: string;
  descriptionClassName?: string;
  arrowClassName?: string;
}

export const ItemLinkCardContent: React.FC<IItemLinkCardContentProps> = ({
  title,
  meta,
  description,
  arrow = '→',
  titleClassName = 'docsApiLinkTitle',
  metaClassName = 'docsApiLinkMeta',
  descriptionClassName = 'docsApiLinkDescription',
  arrowClassName = 'docsApiLinkArrow',
}) => {
  return (
    <>
      <span className={titleClassName}>{title}</span>
      {meta !== undefined ? <span className={metaClassName}>{meta}</span> : null}
      {description !== undefined ? (
        <span className={descriptionClassName}>{description}</span>
      ) : null}
      <span className={arrowClassName} aria-hidden="true">
        {arrow}
      </span>
    </>
  );
};

