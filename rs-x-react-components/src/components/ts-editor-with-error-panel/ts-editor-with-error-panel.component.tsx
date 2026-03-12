'use client';

import type { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { ErrorPanel } from '../error-panel/error-panel';
import { TSEditor } from '../ts-editor/ts-editor.component';

import './ts-editor-with-error-panel.component.css';

export interface ITsEditorWithErrorPanelProp {
  script?: string;
  header: string;
  name?: string;
  namePlaceholder?: string;
  errors: string[];
  saveButtonName?: string;
  hideName?: boolean;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onChange?: (value: string) => void;
  save: (value: string, ame: string) => void;
  cancel?: () => void;
  onMount?: OnMount;
  isEditorLoading?: boolean;
  secondaryActionName?: string;
  secondaryAction?: (value: string, name: string) => void;
  secondaryActionDisabled?: boolean;
}

export const TsEditorWithErrorPanel: React.FC<ITsEditorWithErrorPanelProp> = ({
  script,
  header,
  name,
  namePlaceholder,
  errors,
  saveButtonName,
  hideName,
  options,
  onChange,
  save,
  cancel,
  onMount,
  isEditorLoading,
  secondaryActionName,
  secondaryAction,
  secondaryActionDisabled,
}) => {
  return (
    <div className="tsEditorWithErrorPanel">
      <Group orientation="horizontal" className="panels-container">
        <Panel defaultSize={100} className="panel">
          <Group orientation="vertical" className="panel-stack">
            <Panel defaultSize={70} minSize={10} className="panel">
              <div className="tsEditorHost">
                <TSEditor
                  header={header}
                  namePlaceholder={namePlaceholder}
                  name={name ?? ''}
                  value={script}
                  saveButtonName={saveButtonName}
                  hideName={hideName}
                  options={options}
                  onChange={onChange}
                  save={save}
                  cancel={cancel}
                  onMount={onMount}
                  secondaryActionName={secondaryActionName}
                  secondaryAction={secondaryAction}
                  secondaryActionDisabled={secondaryActionDisabled}
                />
                {isEditorLoading && (
                  <div
                    className="tsEditorLoadingOverlay"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="tsEditorLoadingSpinner" />
                    <span>Loading editor types…</span>
                  </div>
                )}
              </div>
            </Panel>

            <Separator className="separator-horizontal" />

            <Panel defaultSize={30} minSize={10} className="panel">
              <ErrorPanel errors={errors} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};
