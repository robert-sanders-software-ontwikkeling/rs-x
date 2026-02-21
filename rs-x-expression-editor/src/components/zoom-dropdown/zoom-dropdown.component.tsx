import React from 'react';

const zoomPresets = [50, 75, 100, 125, 150, 200, 250, 300];


export interface IZoomDropdown {
    value: number;
    onChange: (value: number) => void;
}


export const ZoomDropdown: React.FC<IZoomDropdown> = ({
    value = 75, 
    onChange,
}) => {
    return (
        <label className='exprTreeHeaderZoom'>
            <span>Zoom</span>
            <select
                value={value}
                onChange={(e) => { onChange(Number(e.target.value)); }}
            >
                {zoomPresets.map((z) => {
                    return (
                        <option key={z} value={z}>
                            {z}%
                        </option>
                    );
                })}
            </select>
        </label>
    );
}