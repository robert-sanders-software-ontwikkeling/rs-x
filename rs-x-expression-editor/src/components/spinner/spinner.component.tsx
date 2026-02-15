import React from 'react';
import './spinner.component.css';




export interface ISpinnerProps {
  size?: number;        // diameter in px
  thickness?: number;   // border thickness
  className?: string;
}

export const Spinner: React.FC<ISpinnerProps> = ({
  size = 40,
  thickness = 4,
  className = ""
}) => {
  return (
    <div
      className={`spinner ${className}`}
      role="status"
      aria-busy="true"
      style={
        {
          "--spinner-size": `${size}px`,
          "--spinner-thickness": `${thickness}px`
        } as React.CSSProperties
      }
    >
      <div className="spinner-circle" />
    </div>
  );
};