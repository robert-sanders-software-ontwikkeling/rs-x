import React, { useEffect, useState } from 'react';
import { FaTimes } from 'react-icons/fa';

import { ZoomDropdown } from '../zoom-dropdown/zoom-dropdown.component';
import { ExpressionTree } from '../expression-tree-view/expression-tree-view.component';
import type { IExpressionInfo } from '../../models/expression-info.interface';
import type { IExpression } from '../../../../rs-x-expression-parser/lib';

export interface IExpressionTreePanelProps {
  selectedExpressionString: string | undefined;
  treeZoomPercent: number;
  expressionInfo: IExpressionInfo;
  onTreeZoomPercentChange: (value: number) => void;
  onClose: () => void;

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
  expressionInfo,
  onTreeZoomPercentChange,
  onClose,
  isVisible,
}) => {
  const version = expressionInfo?.version ?? 0;
  const highlightVersion = expressionInfo?.treeHighlightVersion ?? 0;

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
      <div className='panel-header panel-header-row'>
        <div className='exprTreeHeaderTitle'>
          <span>Expression Tree</span>

          <span className='exprTreeHeaderExpr' title={selectedExpressionString}>
            {selectedExpressionString}
          </span>
        </div>

        <div className='exprTreeHeaderControls'>
          <ZoomDropdown value={treeZoomPercent} onChange={onTreeZoomPercentChange} />

          <button type='button' className='icon-btn' onClick={onClose} title='Close'>
            <FaTimes />
          </button>
        </div>
      </div>

      <div className='panel-body'>
        <ExpressionTree
          key={`${version}:${highlightVersion}`}
          version={version}
          root={expressionInfo?.expression as IExpression}
          highlightChanges={expressionInfo?.treeHighlight ?? []}
          highlightVersion={highlightVersion}
          zoomPercent={treeZoomPercent}
          isVisible={isVisible}
          playNonce={playNonce}
        />
      </div>
    </>
  );
};