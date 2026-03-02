'use client';

import React from 'react';

import { Spinner } from '../../src/components/spinner/spinner.component';

import { useAppBootstrap } from './use-app-bootstrap';

export const AppBootstrapProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const { isReady } = useAppBootstrap();

  if (!isReady) {
    return (
      <div className="fullscreen-loader">
        <Spinner size={60} />
      </div>
    );
  }

  return <>{props.children}</>;
};

export default AppBootstrapProvider;
