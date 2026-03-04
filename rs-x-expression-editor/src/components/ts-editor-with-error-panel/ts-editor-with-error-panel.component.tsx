'use client';

import type { OnMount } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import React from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { ErrorPanel } from '../error-panel/error-panel';
import { TSEditor } from '../ts-editor/ts-editor.component';

export interface ITsEditorWithErrorPanelProp {
  script?: string;
  header: string;
  name?: string;
  namePlaceholder?: string;
  editorPlaceholder?: string;
  errors: string[];
  saveButtonName?: string;
  hideName?: boolean;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onChange?: (value: string) => void;
  save: (value: string, ame: string) => void;
  cancel?: () => void;
  onMount?: OnMount;
}

export const TsEditorWithErrorPanel: React.FC<ITsEditorWithErrorPanelProp> = ({
  script,
  header,
  name,
  namePlaceholder,
  editorPlaceholder,
  errors,
  saveButtonName,
  hideName,
  options,
  onChange,
  save,
  cancel,
  onMount,
}) => {
  return (
    <Group orientation="horizontal" className="panels-container">
      <Panel defaultSize={100} className="panel">
        <Group orientation="vertical" className="panel-stack">
          <Panel defaultSize={70} minSize={10} className="panel">
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
            />
          </Panel>

          <Separator className="separator-horizontal" />

          <Panel defaultSize={30} minSize={10} className="panel">
            <ErrorPanel errors={errors} />
          </Panel>
        </Group>
      </Panel>
    </Group>
  );
};
