import React, { useEffect, useState } from 'react';
import './model-editor.component.css';

type Path = Array<string | number>;
type AnyRecord = Record<string, any>;

export interface ModelEditorProps<T extends AnyRecord> {
  modelIndex: number;
  model: T;
  onCommit: (modelIndex: number, model: T) => void;
  title?: string;

  // Controls indentation per nesting level (px)
  // Recommended default: 8
  indentSize?: number;
}

/* ---------------- Utilities ---------------- */

const isPlainObject = (v: unknown): v is AnyRecord => {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
};

const deepClone = <T,>(obj: T): T => {
  return structuredClone(obj);
};

const setAtPath = <T,>(root: T, path: Path, value: unknown): T => {
  if (path.length === 0) {
    return value as T;
  }

  const [head, ...tail] = path;

  if (Array.isArray(root)) {
    const idx = head as number;
    const copy = root.slice();
    copy[idx] = setAtPath(copy[idx], tail, value);
    return copy as unknown as T;
  }

  const obj = { ...(root as any) };
  obj[head as string] = setAtPath(obj[head as string], tail, value);
  return obj;
};

/* ---------------- Recursive Node ---------------- */

const ModelNode: React.FC<{
  value: any;
  path: Path;
  depth: number;
  indentSize: number;
  onChange: (path: Path, value: any) => void;
}> = ({ value, path, depth, indentSize, onChange }) => {
  if (value === null || value === undefined) {
    return <div className="me-muted">null</div>;
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

  if (isPlainObject(value)) {
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

  return <div className="me-muted">{String(value)}</div>;
};


export function ModelEditor<T extends AnyRecord>({
  modelIndex,
  model,
  onCommit,
  title = 'Model',
  indentSize = 8,
}: ModelEditorProps<T>) {
  const [draft, setDraft] = useState<T>(() => deepClone(model));

  // Rebind if parent model changes
  useEffect(() => {
    setDraft(deepClone(model));
  }, [model]);

  const handleChange = (path: Path, value: any) => {
    setDraft((prev) => {
      return setAtPath(prev, path, value);
    });
  };

  const handleCommit = () => {
    onCommit(modelIndex, deepClone(draft));
  };



  return (
    <div className="me-root">
      <ModelNode value={draft} path={[]} depth={0} indentSize={indentSize} onChange={handleChange} />

      <div className="me-actions">
        <button className="btn btn--commit" type="button" onClick={handleCommit}>
          Commit
        </button>
      </div>
    </div>
  );
}