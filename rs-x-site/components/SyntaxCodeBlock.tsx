import type { CSSProperties } from 'react';

import { CodeViewer } from '@rs-x/react-components';

interface SyntaxCodeBlockProps {
  code: string;
  className?: string;
  style?: CSSProperties;
}

export function SyntaxCodeBlock({
  code,
  className = 'qsCodeBlock',
  style,
}: SyntaxCodeBlockProps) {
  return (
    <CodeViewer
      code={code}
      className={className}
      style={style}
      toggleButtonClassName="btn btnGhost btnSm"
    />
  );
}
