import React from 'react';

export interface IErrorPanel {
  errors: string[];
}

export const ErrorPanel: React.FC<IErrorPanel> = ({ errors }) => {
  return (
    <>
      <div className="panel-header">Errors</div>
      <div className="panel-body">
        {errors?.map((error, index) => (
          <p key={`${index}`}>{error}</p>
        ))}
      </div>
    </>
  );
};
