import React from 'react';
import { createRoot } from 'react-dom/client';

import { useRsxModel } from '@rs-x/react';

import { type IModelWithId } from '../proxies/model-with-id.interface';
import { RsxService } from '../proxies/rsx-service';

import './panel.component.css';

interface IRsxModel {
  models: Promise<IModelWithId[]> | null;
}

interface IResolvedRsxModel {
  models: IModelWithId[];
}

const Panel: React.FC = () => {
  const rsxService = RsxService.getInstance();
  const rsxModel: IRsxModel = {
    models: rsxService.getModels(),
  };
  const { models } = useRsxModel<IRsxModel, IResolvedRsxModel>(rsxModel);

  return (
    <div>
      <h2>RS-X Reactive Model</h2>
      {(models || []).map((model) => (
        <div>{JSON.stringify(model)}</div>
      ))}
    </div>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const rootEl = document.getElementById('root');
  const root = createRoot(rootEl!);
  root.render(<Panel />);
});
