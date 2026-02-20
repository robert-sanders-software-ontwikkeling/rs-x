import { useEffect } from 'react';

export function useDebouncedEffect(
  effect: () => void | Promise<void>,
  deps: React.DependencyList,
  delay: number
): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const result = effect();
      if (result instanceof Promise) {
        result.catch(console.error);
      }
    }, delay);

    return () => {
      window.clearTimeout(id);
    };
  }, [...deps, delay]);
}