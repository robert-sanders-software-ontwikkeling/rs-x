import React from 'react';

import '../src/app.css';

const RootLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
};

export default RootLayout;
