import React, { useState, ReactNode } from 'react';
import './accordion.component.css';

export interface AccordionPanel {
  id: string;
  header: ReactNode;
  body: ReactNode;
}

export interface AccordionProps {
  panels: AccordionPanel[];
  openPanelId?: string | null;
  onOpenChange?: (id: string | null) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  panels,
  openPanelId: controlledOpenPanelId,
  onOpenChange,
}) => {

  const [internalOpenPanelId, setInternalOpenPanelId] = useState<string | null>(null);

  // Use controlled value if provided, otherwise internal state
  const openPanelId =
    controlledOpenPanelId !== undefined
      ? controlledOpenPanelId
      : internalOpenPanelId;

  const setOpenPanelId = (id: string | null) => {
    if (onOpenChange) {
      onOpenChange(id);
    }
    if (controlledOpenPanelId === undefined) {
      setInternalOpenPanelId(id);
    }
  };

  const togglePanel = (id: string) => {
    const nextId = openPanelId === id ? null : id;
    setOpenPanelId(nextId);
  };

  return (
    <div className="accordion">
      {panels.map((panel) => (
        <div
          key={panel.id}
          className={`accordion-panel ${openPanelId === panel.id ? 'is-open' : ''}`}
        >
          <div
            className="panel-header"
            onClick={() => togglePanel(panel.id)}
          >
            {panel.header}
          </div>

          {openPanelId === panel.id && (
            <div className="accordion-body">
              {panel.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};