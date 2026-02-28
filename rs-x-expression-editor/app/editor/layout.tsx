import React from 'react';

import { EditorProvider } from './provider.client';

const EditorLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  return <EditorProvider>{props.children}</EditorProvider>;
};

export default EditorLayout;
