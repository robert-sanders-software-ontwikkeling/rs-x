// app/editor/layout.tsx
import React from 'react';

import AppBootstrapProvider from '../providers/app-bootstrap.provider.client';

import EditorProvider from './provider.client';

const EditorLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <AppBootstrapProvider>
      <EditorProvider>{props.children}</EditorProvider>
    </AppBootstrapProvider>
  );
};

export default EditorLayout;
