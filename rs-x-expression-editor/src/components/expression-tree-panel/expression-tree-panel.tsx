import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

import type {
  IExpression,
  IExpressionChangeHistory,
} from '@rs-x/expression-parser';

import { ExpressionTree } from '../expression-tree-view/expression-tree-view.component';
import { ZoomDropdown } from '../zoom-dropdown/zoom-dropdown.component';

export interface IExpressionTreePanelProps {
  selectedExpressionString: string | undefined;
  treeZoomPercent: number;
  expression: IExpression;
  version: number;
  highlightVersion: number;
  treeHighlight: IExpressionChangeHistory[];
  onTreeZoomPercentChange: (value: number) => void;
  onClose?: () => void;

  // IMPORTANT: pass true only when the details view is actually shown
  isVisible: boolean;
}

/**
 * Must roughly match your CSS slide transition duration.
 * If your view-layer uses ~260ms, use 280-320ms here.
 */
const PANEL_SHOW_DELAY_MS = 300;

export const ExpressionTreePanel: React.FC<IExpressionTreePanelProps> = ({
  selectedExpressionString,
  treeZoomPercent,
  expression,
  version,
  highlightVersion,
  treeHighlight,
  onTreeZoomPercentChange,
  onClose,
  isVisible,
}) => {
  // This forces the highlight animation to play again after panel becomes visible.
  const [playNonce, setPlayNonce] = useState<number>(0);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // Wait for slide/fade transition to finish, then trigger animation.
    const t = window.setTimeout(() => {
      setPlayNonce((n) => n + 1);
    }, PANEL_SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(t);
    };
  }, [isVisible, version, highlightVersion]);

  return (
    <>
      <div className="panel-header panel-header-row">
        <div className="exprTreeHeaderTitle">
          <span>Expression Tree</span>

          <span className="exprTreeHeaderExpr" title={selectedExpressionString}>
            {selectedExpressionString}
          </span>
        </div>

        <div className="exprTreeHeaderControls">
          <ZoomDropdown
            value={treeZoomPercent}
            onChange={onTreeZoomPercentChange}
          />
          {onClose && (
            <button
              type="button"
              className="icon-btn"
              onClick={onClose}
              title="Close"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="panel-body">
        <ExpressionTree
          key={`${version}:${highlightVersion}`}
          version={version}
          root={expression}
          highlightChanges={treeHighlight ?? []}
          highlightVersion={highlightVersion}
          zoomPercent={treeZoomPercent}
          isVisible={isVisible}
          playNonce={playNonce}
        />
      </div>
    </>
  );
};
