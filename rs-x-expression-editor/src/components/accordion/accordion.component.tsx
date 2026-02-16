import React, { useState, ReactNode } from 'react';
import './accordion.component.css';

export interface AccordionPanel {
  id: string;
  header: ReactNode;
  body: ReactNode;
}

export interface AccordionProps {
  panels: AccordionPanel[];
  openPanelIndex?: number | null;
  onOpenChange?: (index: number) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  panels,
  openPanelIndex,
  onOpenChange,
}) => {

  const [internalOpenPanelId, setInternalOpenPanelId] = useState<number | null>( openPanelIndex ?? 0);


  const setOpenPanelIndex = (index: number) => {
    if (onOpenChange) {
      onOpenChange(index);
    }
    setInternalOpenPanelId(index)
  
  }; 

  const togglePanel = (index: number) => {
    if( internalOpenPanelId === index) {
      return;
    }
    setOpenPanelIndex(index);
  };

  return (
    <div className="accordion">
      {panels.map((panel, index) => (
        <div
          key={panel.id}
          className={`accordion-panel ${internalOpenPanelId === index? 'is-open' : ''}`}
        >
          <div
            className="panel-header"
            onClick={() => togglePanel(index)}
          >
            {panel.header}
          </div>

          {internalOpenPanelId === index && (
            <div className="accordion-body">
              {panel.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};