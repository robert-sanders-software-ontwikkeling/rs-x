// app/editor/layout.tsx
import React from 'react';
import EditorProvider from './provider.client';
import AppBootstrapProvider from '../providers/app-bootstrap.provider.client';

const EditorLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <AppBootstrapProvider>
      <EditorProvider>{props.children}</EditorProvider>
    </AppBootstrapProvider>
  );
};

export default EditorLayout;