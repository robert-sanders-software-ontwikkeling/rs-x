import React, { useEffect, useState } from 'react';

import type { IDeepClone, IValueMetadata } from '@rs-x/core';
import { InjectionContainer, RsXCoreInjectionTokens, Type } from '@rs-x/core';

import './model-editor.component.css';

type PathKey = string | number;
type Path = ReadonlyArray<PathKey>;
type PlainObject = Record<string, unknown>;

class DeepClone {
  private static _instance: DeepClone;
  private readonly _valueMetadata: IValueMetadata;
  private readonly _deepClone: IDeepClone;

  private constructor() {
    this._valueMetadata = InjectionContainer.get(
      RsXCoreInjectionTokens.IValueMetadata,
    );
    this._deepClone = InjectionContainer.get(RsXCoreInjectionTokens.IDeepClone);
  }

  public static getInstance(): DeepClone {
    if (!this._instance) {
      this._instance = new DeepClone();
    }
    return this._instance;
  }

  private filterFields(obj: unknown, current: PlainObject): PlainObject {
    if (obj === null || typeof obj !== 'object') {
      return current;
    }

    Type.walkObjectTopToBottom(
      obj as object,
      (_, index, value) => {
        if (
          this._valueMetadata.isAsync(value) ||
          Type.isFunction(value) ||
          Type.isArrowFunction(value)
        ) {
          return;
        }

        if (Type.isPlainObject(value)) {
          current[index] = this.filterFields(value, {});
          return;
        }

        current[index] = value;
      },
      false,
    );

    return current;
  }

  public clone(object: unknown): unknown {
    if (object === null || typeof object !== 'object') {
      return object;
    }

    const editableRecords = this.filterFields(object, {});
    return this._deepClone.clone(editableRecords);
  }
}

const isDate = (v: unknown): v is Date => {
  return v instanceof Date;
};

const isMap = (v: unknown): v is Map<unknown, unknown> => {
  return v instanceof Map;
};

const isSet = (v: unknown): v is Set<unknown> => {
  return v instanceof Set;
};

const isFunction = (v: unknown): v is (...args: unknown[]) => unknown => {
  return typeof v === 'function';
};

const formatValue = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'symbol') {
    return value.toString();
  }
  if (isDate(value)) {
    return `Date(${Number.isNaN(value.getTime()) ? 'Invalid' : value.toISOString()})`;
  }
  if (isMap(value)) {
    return `Map(${value.size})`;
  }
  if (isSet(value)) {
    return `Set(${value.size})`;
  }
  if (isFunction(value)) {
    return `Function(${value.name || 'anonymous'})`;
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === 'object') {
    const ctor = (value as object).constructor;
    const name = ctor && typeof ctor === 'function' ? ctor.name : 'Object';
    return name;
  }
  return String(value);
};

const cloneForDraft = (model: unknown): unknown => {
  return DeepClone.getInstance().clone(model);
};

const setAtPath = (root: unknown, path: Path, value: unknown): unknown => {
  if (path.length === 0) {
    return value;
  }

  const [head, ...tail] = path;

  if (Array.isArray(root)) {
    const idx = typeof head === 'number' ? head : Number(head);
    const safeIdx = Number.isFinite(idx) ? idx : 0;

    const copy = root.slice();
    copy[safeIdx] = setAtPath(copy[safeIdx], tail, value);
    return copy;
  }

  if (Type.isPlainObject(root) && typeof head === 'string') {
    const copy: PlainObject = { ...root };
    copy[head] = setAtPath(copy[head], tail, value);
    return copy;
  }

  // Non-editable containers: Map/Set/Date/function/class instances.
  // We keep them as-is unless you implement a dedicated editor for them.
  return root;
};

/* ---------------- Recursive Node ---------------- */

const ModelNode: React.FC<{
  value: unknown;
  path: Path;
  depth: number;
  indentSize: number;
  onChange: (path: Path, value: unknown) => void;
}> = ({ value, path, depth, indentSize, onChange }) => {
  if (value === null) {
    return <div className="me-muted">null</div>;
  }

  if (value === undefined) {
    return <div className="me-muted">undefined</div>;
  }

  if (typeof value === 'string') {
    return (
      <input
        className="me-input"
        value={value}
        onChange={(e) => {
          onChange(path, e.target.value);
        }}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <input
        className="me-input"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(path, raw === '' ? 0 : Number(raw));
        }}
      />
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="me-toggle">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => {
            onChange(path, e.target.checked);
          }}
        />
        <span>{value ? 'true' : 'false'}</span>
      </label>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="me-section" style={{ paddingLeft: depth * indentSize }}>
        {value.map((item, index) => {
          return (
            <div key={index} className="me-field">
              <div className="me-label">
                <div className="me-key">[{index}]</div>
              </div>
              <div className="me-control">
                <ModelNode
                  value={item}
                  path={[...path, index]}
                  depth={depth + 1}
                  indentSize={indentSize}
                  onChange={onChange}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (Type.isPlainObject(value)) {
    return (
      <div className="me-section" style={{ paddingLeft: depth * indentSize }}>
        {Object.entries(value).map(([key, val]) => {
          return (
            <div key={key} className="me-field">
              <div className="me-label">
                <div className="me-key">{key}</div>
              </div>
              <div className="me-control">
                <ModelNode
                  value={val}
                  path={[...path, key]}
                  depth={depth + 1}
                  indentSize={indentSize}
                  onChange={onChange}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Show Map/Set/Date/functions/class instances as read-only for now
  return <div className="me-muted">{formatValue(value)}</div>;
};

export interface ModelEditorProps {
  modelIndex: number;
  model: unknown;
  onCommit: (modelIndex: number, model: unknown) => void;
  title?: string;
  indentSize?: number;
}

export function ModelEditor({
  modelIndex,
  model,
  onCommit,
  indentSize = 8,
}: ModelEditorProps) {
  const [draft, setDraft] = useState<unknown>(() => cloneForDraft(model));

  useEffect(() => {
    setDraft(cloneForDraft(model));
  }, [model]);

  const handleChange = (path: Path, value: unknown) => {
    setDraft((prev) => {
      return setAtPath(prev, path, value);
    });
  };

  const handleCommit = () => {
    onCommit(modelIndex, draft);
  };

  return (
    <div className="me-root">
      <ModelNode
        value={draft}
        path={[]}
        depth={0}
        indentSize={indentSize}
        onChange={handleChange}
      />

      <div className="me-actions">
        <button
          className="btn btn--commit"
          type="button"
          onClick={handleCommit}
        >
          Commit
        </button>
      </div>
    </div>
  );
}
