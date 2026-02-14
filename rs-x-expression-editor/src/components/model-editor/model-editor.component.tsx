import React, { useMemo, useState } from 'react';
import './model-editor.component.css';

type Path = Array<string | number>;
type AnyRecord = Record<string, any>;

export interface ModelEditorProps<T extends AnyRecord> {
  model: T;
  onChange: (next: T) => void;

  title?: string;
  hiddenKeys?: string[];
  multilineKeys?: string[];
  maxDepth?: number;
  editableCollections?: boolean;
}

/* -------------------------- Utils -------------------------- */

const isPlainObject = (v: unknown): v is AnyRecord => {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    !(v instanceof Map) &&
    !(v instanceof Set)
  );
};

const pad2 = (n: number): string => {
  return String(n).padStart(2, '0');
};

const dateToLocalInput = (d: Date): string => {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const localInputToDate = (s: string): Date => {
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    return new Date();
  }
  return d;
};

const prettyLabel = (k: string): string => {
  return k
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
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

const defaultNewValueFor = (sample: any): any => {
  if (sample instanceof Date) {
    return new Date();
  }
  if (sample instanceof Map) {
    return new Map();
  }
  if (sample instanceof Set) {
    return new Set();
  }
  if (typeof sample === 'string') {
    return '';
  }
  if (typeof sample === 'number') {
    return 0;
  }
  if (typeof sample === 'boolean') {
    return false;
  }
  if (Array.isArray(sample)) {
    return [];
  }
  if (isPlainObject(sample)) {
    return {};
  }
  return null;
};

const matchesFilter = (filter: string, path: string): boolean => {
  const f = filter.trim().toLowerCase();
  if (!f) {
    return true;
  }
  return path.toLowerCase().includes(f);
};

/* ------------------------ UI Pieces ------------------------ */

const FieldRow: React.FC<{ label: string; path: string; children: React.ReactNode }> = ({
  label,
  path,
  children,
}) => {
  return (
    <div className="me-field">
      <div className="me-label">
        <div className="me-key">{label}</div>
        <div className="me-path">{path}</div>
      </div>
      <div className="me-control">{children}</div>
    </div>
  );
};

/* ---------------------- Primitive Fields ---------------------- */

const StringField: React.FC<{
  value: string;
  isMultiline: boolean;
  onChange: (next: string) => void;
}> = ({ value, isMultiline, onChange }) => {
  if (isMultiline) {
    return (
      <textarea
        className="me-textarea"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    );
  }

  return (
    <input
      className="me-input"
      type="text"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
    />
  );
};

const NumberField: React.FC<{ value: number; onChange: (next: number) => void }> = ({ value, onChange }) => {
  return (
    <input
      className="me-input"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? 0 : Number(raw));
      }}
    />
  );
};

const BooleanField: React.FC<{ value: boolean; onChange: (next: boolean) => void }> = ({ value, onChange }) => {
  return (
    <label className="me-toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />
      <span>{value ? 'true' : 'false'}</span>
    </label>
  );
};

const DateField: React.FC<{ value: Date; onChange: (next: Date) => void }> = ({ value, onChange }) => {
  return (
    <div className="me-row">
      <input
        className="me-input"
        type="datetime-local"
        step={1}
        value={dateToLocalInput(value)}
        onChange={(e) => {
          onChange(localInputToDate(e.target.value));
        }}
      />
      <button
        className="btn me-small-btn"
        type="button"
        onClick={() => {
          onChange(new Date());
        }}
      >
        Now
      </button>
    </div>
  );
};

/* ---------------------- Collection Editors ---------------------- */

const ArrayEditor: React.FC<{
  value: any[];
  path: Path;
  displayPath: string;
  depth: number;
  ctx: RenderContext;
}> = ({ value, path, displayPath, depth, ctx }) => {
  const { editableCollections } = ctx;

  return (
    <div className="me-section">
      <div className="me-section-header">
        <div className="me-muted">Array ({value.length})</div>

        {editableCollections && (
          <button
            className="btn me-small-btn"
            type="button"
            onClick={() => {
              const sample = value.length ? value[value.length - 1] : '';
              const nextItem = defaultNewValueFor(sample);
              ctx.onChange(setAtPath(ctx.model, path, [...value, nextItem]));
            }}
          >
            + Add
          </button>
        )}
      </div>

      <div className="me-collection">
        {value.map((item, idx) => {
          const itemPath = [...path, idx];
          const itemDisplayPath = `${displayPath}[${idx}]`;

          return (
            <div key={idx} className="me-card">
              <div className="me-card-header">
                <div className="me-key">#{idx}</div>

                {editableCollections && (
                  <button
                    className="btn me-small-btn me-danger"
                    type="button"
                    onClick={() => {
                      const next = value.filter((_, i) => i !== idx);
                      ctx.onChange(setAtPath(ctx.model, path, next));
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="me-card-body">
                <ModelNode value={item} path={itemPath} displayPath={itemDisplayPath} depth={depth + 1} ctx={ctx} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MapEditor: React.FC<{
  value: Map<any, any>;
  path: Path;
  displayPath: string;
  depth: number;
  ctx: RenderContext;
}> = ({ value, path, displayPath, depth, ctx }) => {
  const { editableCollections } = ctx;
  const entries = Array.from(value.entries());

  return (
    <div className="me-section">
      <div className="me-section-header">
        <div className="me-muted">Map ({entries.length})</div>

        {editableCollections && (
          <button
            className="btn me-small-btn"
            type="button"
            onClick={() => {
              const next = new Map(value);
              next.set('', '');
              ctx.onChange(setAtPath(ctx.model, path, next));
            }}
          >
            + Add entry
          </button>
        )}
      </div>

      <div className="me-collection">
        {entries.map(([k, v], idx) => {
          return (
            <div key={idx} className="me-card">
              <div className="me-card-header">
                <div className="me-key">#{idx}</div>

                {editableCollections && (
                  <button
                    className="btn me-small-btn me-danger"
                    type="button"
                    onClick={() => {
                      const next = new Map(value);
                      next.delete(k);
                      ctx.onChange(setAtPath(ctx.model, path, next));
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="me-card-body me-map-grid">
                <div className="me-map-col">
                  <div className="me-muted">Key</div>
                  <input
                    className="me-input"
                    type="text"
                    value={String(k)}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      const next = new Map(value);
                      next.delete(k);
                      next.set(nextKey, v);
                      ctx.onChange(setAtPath(ctx.model, path, next));
                    }}
                  />
                </div>

                <div className="me-map-col">
                  <div className="me-muted">Value</div>
                  <MapValueField map={value} mapPath={path} mapKey={k} value={v} ctx={ctx} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filterHint(displayPath, ctx.filter)}
    </div>
  );
};

const MapValueField: React.FC<{
  map: Map<any, any>;
  mapPath: Path;
  mapKey: any;
  value: any;
  ctx: RenderContext;
}> = ({ map, mapPath, mapKey, value, ctx }) => {
  const commit = (nextVal: any) => {
    const next = new Map(map);
    next.set(mapKey, nextVal);
    ctx.onChange(setAtPath(ctx.model, mapPath, next));
  };

  if (value === null || value === undefined) {
    return (
      <StringField
        value=""
        isMultiline={false}
        onChange={(s) => {
          commit(s);
        }}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <StringField
        value={value}
        isMultiline={value.includes('\n') || value.length > 120}
        onChange={(s) => {
          commit(s);
        }}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <NumberField
        value={value}
        onChange={(n) => {
          commit(n);
        }}
      />
    );
  }

  if (typeof value === 'boolean') {
    return (
      <BooleanField
        value={value}
        onChange={(b) => {
          commit(b);
        }}
      />
    );
  }

  if (value instanceof Date) {
    return (
      <DateField
        value={value}
        onChange={(d) => {
          commit(d);
        }}
      />
    );
  }

  return <div className="me-muted">Complex Map value not editable inline</div>;
};

const SetEditor: React.FC<{
  value: Set<any>;
  path: Path;
  displayPath: string;
  depth: number;
  ctx: RenderContext;
}> = ({ value, path, displayPath, depth, ctx }) => {
  const { editableCollections } = ctx;
  const items = Array.from(value.values());

  return (
    <div className="me-section">
      <div className="me-section-header">
        <div className="me-muted">Set ({items.length})</div>

        {editableCollections && (
          <button
            className="btn me-small-btn"
            type="button"
            onClick={() => {
              const next = new Set(value);
              next.add('');
              ctx.onChange(setAtPath(ctx.model, path, next));
            }}
          >
            + Add value
          </button>
        )}
      </div>

      <div className="me-collection">
        {items.map((item, idx) => {
          return (
            <div key={idx} className="me-card">
              <div className="me-card-header">
                <div className="me-key">#{idx}</div>

                {editableCollections && (
                  <button
                    className="btn me-small-btn me-danger"
                    type="button"
                    onClick={() => {
                      const next = new Set(value);
                      next.delete(item);
                      ctx.onChange(setAtPath(ctx.model, path, next));
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>

              <div className="me-card-body">
                <SetItemField set={value} setPath={path} item={item} ctx={ctx} />
              </div>
            </div>
          );
        })}
      </div>

      {filterHint(displayPath, ctx.filter)}
    </div>
  );
};

const SetItemField: React.FC<{
  set: Set<any>;
  setPath: Path;
  item: any;
  ctx: RenderContext;
}> = ({ set, setPath, item, ctx }) => {
  const commitReplace = (nextItem: any) => {
    const next = new Set(set);
    next.delete(item);
    next.add(nextItem);
    ctx.onChange(setAtPath(ctx.model, setPath, next));
  };

  if (item === null || item === undefined) {
    return <div className="me-muted">null</div>;
  }

  if (typeof item === 'string') {
    return (
      <StringField
        value={item}
        isMultiline={item.includes('\n') || item.length > 120}
        onChange={(s) => {
          commitReplace(s);
        }}
      />
    );
  }

  if (typeof item === 'number') {
    return (
      <NumberField
        value={item}
        onChange={(n) => {
          commitReplace(n);
        }}
      />
    );
  }

  if (typeof item === 'boolean') {
    return (
      <BooleanField
        value={item}
        onChange={(b) => {
          commitReplace(b);
        }}
      />
    );
  }

  if (item instanceof Date) {
    return (
      <DateField
        value={item}
        onChange={(d) => {
          commitReplace(d);
        }}
      />
    );
  }

  return <div className="me-muted">Complex Set item not editable inline</div>;
};

const filterHint = (displayPath: string, filter: string) => {
  if (!filter.trim()) {
    return null;
  }

  if (!matchesFilter(filter, displayPath)) {
    return null;
  }

  return <div className="me-muted">Matched: {displayPath}</div>;
};

/* ---------------------- Recursive Node ---------------------- */

type RenderContext = {
  model: any;
  onChange: (next: any) => void;
  hidden: Set<string>;
  multiline: Set<string>;
  filter: string;
  maxDepth: number;
  editableCollections: boolean;
};

const ModelNode: React.FC<{
  value: any;
  path: Path;
  displayPath: string;
  depth: number;
  ctx: RenderContext;
}> = ({ value, path, displayPath, depth, ctx }) => {
  if (depth > ctx.maxDepth) {
    return <div className="me-muted">Max depth reached</div>;
  }

  if (value === null || value === undefined) {
    return <div className="me-muted">null</div>;
  }

  if (value instanceof Date) {
    return (
      <DateField
        value={value}
        onChange={(d) => {
          ctx.onChange(setAtPath(ctx.model, path, d));
        }}
      />
    );
  }

  if (typeof value === 'string') {
    const last = path[path.length - 1];
    const isMulti = (typeof last === 'string' && ctx.multiline.has(last)) || value.includes('\n') || value.length > 120;

    return (
      <StringField
        value={value}
        isMultiline={isMulti}
        onChange={(s) => {
          ctx.onChange(setAtPath(ctx.model, path, s));
        }}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <NumberField
        value={value}
        onChange={(n) => {
          ctx.onChange(setAtPath(ctx.model, path, n));
        }}
      />
    );
  }

  if (typeof value === 'boolean') {
    return (
      <BooleanField
        value={value}
        onChange={(b) => {
          ctx.onChange(setAtPath(ctx.model, path, b));
        }}
      />
    );
  }

  if (Array.isArray(value)) {
    return <ArrayEditor value={value} path={path} displayPath={displayPath} depth={depth} ctx={ctx} />;
  }

  if (value instanceof Map) {
    return <MapEditor value={value} path={path} displayPath={displayPath} depth={depth} ctx={ctx} />;
  }

  if (value instanceof Set) {
    return <SetEditor value={value} path={path} displayPath={displayPath} depth={depth} ctx={ctx} />;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([k]) => !ctx.hidden.has(k));

    return (
      <div className="me-section">
        {entries.map(([k, v]) => {
          const childPathStr = displayPath ? `${displayPath}.${k}` : k;

          if (!matchesFilter(ctx.filter, childPathStr)) {
            return null;
          }

          return (
            <FieldRow key={k} label={prettyLabel(k)} path={childPathStr}>
              <ModelNode value={v} path={[...path, k]} displayPath={childPathStr} depth={depth + 1} ctx={ctx} />
            </FieldRow>
          );
        })}
      </div>
    );
  }

  return <div className="me-muted">{String(value)}</div>;
};

/* ---------------------- Top-level Editor ---------------------- */

export function ModelEditor<T extends AnyRecord>({
  model,
  onChange,
  title = 'Model',
  hiddenKeys = [],
  multilineKeys = [],
  maxDepth = 12,
  editableCollections = true,
}: ModelEditorProps<T>) {
  const [filter, setFilter] = useState('');

  const hidden = useMemo(() => {
    return new Set(hiddenKeys);
  }, [hiddenKeys]);

  const multiline = useMemo(() => {
    return new Set(multilineKeys);
  }, [multilineKeys]);

  const ctx: RenderContext = {
    model,
    onChange,
    hidden,
    multiline,
    filter,
    maxDepth,
    editableCollections,
  };

  return (
    <div className="me-root">
      <div className="me-top">
        <div className="me-title">{title}</div>
        <input
          className="me-filter"
          type="text"
          placeholder="Filter fields..."
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
          }}
        />
      </div>

      <ModelNode value={model} path={[]} displayPath="" depth={0} ctx={ctx} />
    </div>
  );
}