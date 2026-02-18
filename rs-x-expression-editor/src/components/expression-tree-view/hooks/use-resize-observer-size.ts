import { useEffect, useRef, useState } from 'react';


class ResizeObserverController<T extends HTMLElement> {
  private _ro: ResizeObserver | null = null;

  public attach(el: T, onSize: (size: { width: number; height: number }) => void): void {
    this.detach();

    this._ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const cr = entry.contentRect;
      onSize({ width: cr.width, height: cr.height });
    });

    this._ro.observe(el);
  }

  public detach(): void {
    if (!this._ro) {
      return;
    }

    this._ro.disconnect();
    this._ro = null;
  }
}

export function useResizeObserverSize<T extends HTMLElement>(): [
  React.RefObject<T | null>,
  { width: number; height: number }
] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const controllerRef = useRef<ResizeObserverController<T> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new ResizeObserverController<T>();
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    controllerRef.current!.attach(el, (s) => {
      setSize(() => s);
    });

    return () => {
      controllerRef.current!.detach();
    };
  }, []);

  return [ref, size];
}
