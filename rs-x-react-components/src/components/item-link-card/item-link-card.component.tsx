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
  arrow = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 9H14M14 9L10 5M14 9L10 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  titleClassName = 'docsApiLinkTitle',
  metaClassName = 'docsApiLinkMeta',
  descriptionClassName = 'docsApiLinkDescription',
  arrowClassName = 'docsApiLinkArrow',
}) => {
  return (
    <>
      <span className={titleClassName}>{title}</span>
      {meta !== undefined ? (
        <span className={metaClassName}>{meta}</span>
      ) : null}
      {description !== undefined ? (
        <span className={descriptionClassName}>{description}</span>
      ) : null}
      <span className={arrowClassName} aria-hidden="true">
        {arrow}
      </span>
    </>
  );
};
