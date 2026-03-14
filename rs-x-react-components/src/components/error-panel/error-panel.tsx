import React from 'react';

import './error-panel.component.css';

export interface IErrorPanel {
  errors: string[];
}

export const ErrorPanel: React.FC<IErrorPanel> = ({ errors }) => {
  return (
    <div className="errorPanel">
      <div className="panel-header">Errors</div>
      <div className="panel-body errorPanelBody">
        {!errors?.length ? (
          <p className="errorPanelEmpty">No errors</p>
        ) : (
          <ul className="errorPanelList">
            {errors.map((error, index) => (
              <li key={`${index}`} className="errorPanelItem">
                {error}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
