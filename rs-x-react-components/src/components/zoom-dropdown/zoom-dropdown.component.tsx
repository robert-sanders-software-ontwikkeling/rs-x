import React from 'react';

import { ZOOM_PRESETS } from './zoom-presets';

export interface IZoomDropdown {
  value: number;
  onChange: (value: number) => void;
}

export const ZoomDropdown: React.FC<IZoomDropdown> = ({
  value = 50,
  onChange,
}) => {
  return (
    <label className="exprTreeHeaderZoom">
      <span>Zoom</span>
      <select
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      >
        {ZOOM_PRESETS.map((z) => {
          return (
            <option key={z} value={z}>
              {z}%
            </option>
          );
        })}
      </select>
    </label>
  );
};
