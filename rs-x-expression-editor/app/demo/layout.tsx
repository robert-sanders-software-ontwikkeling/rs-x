import React from 'react';

import AppBootstrapProvider from '../providers/app-bootstrap.provider.client';

const DemoLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  return <AppBootstrapProvider>{props.children}</AppBootstrapProvider>;
};

export default DemoLayout;
