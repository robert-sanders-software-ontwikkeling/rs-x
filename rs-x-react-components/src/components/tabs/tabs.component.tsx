'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import './tabs.component.css';

type TabValue = string;

export interface ITabItem<T extends TabValue = string> {
  value: T;
  label: React.ReactNode;
  title?: string;
  disabled?: boolean;
}

export interface ITabsProps<T extends TabValue = string> {
  ariaLabel: string;
  items: readonly ITabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  persistKey?: string;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  labelClassName?: string;
  unstyled?: boolean;
}

function joinClassNames(classes: Array<string | undefined>): string | undefined {
  const joined = classes.filter(Boolean).join(' ');
  return joined.length > 0 ? joined : undefined;
}

function moveIndex<T extends TabValue>(
  items: readonly ITabItem<T>[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (items.length === 0) {
    return -1;
  }

  let nextIndex = currentIndex;
  for (let i = 0; i < items.length; i++) {
    nextIndex = (nextIndex + direction + items.length) % items.length;
    if (!items[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return currentIndex;
}

function firstEnabledIndex<T extends TabValue>(
  items: readonly ITabItem<T>[],
): number {
  for (let i = 0; i < items.length; i++) {
    if (!items[i]?.disabled) {
      return i;
    }
  }
  return -1;
}

function lastEnabledIndex<T extends TabValue>(
  items: readonly ITabItem<T>[],
): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]?.disabled) {
      return i;
    }
  }
  return -1;
}

export const Tabs = <T extends TabValue = string>({
  ariaLabel,
  items,
  value,
  onValueChange,
  persistKey,
  className,
  listClassName,
  tabClassName,
  activeTabClassName,
  labelClassName,
  unstyled = false,
}: ITabsProps<T>): React.ReactElement => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasInitializedPersistence = useRef<boolean>(false);
  const isApplyingStoredValue = useRef<boolean>(false);
  const lastPersistenceScopeKey = useRef<string>('');
  const activeIndex = useMemo(() => {
    const resolvedIndex = items.findIndex((item) => item.value === value);
    return resolvedIndex >= 0 ? resolvedIndex : firstEnabledIndex(items);
  }, [items, value]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, items.length);
  }, [items.length]);

  const persistenceScopeKey = useMemo(() => {
    if (!persistKey) {
      return '';
    }

    const itemSignature = items.map((item) => item.value).join('|');
    return `${persistKey}::${itemSignature}`;
  }, [persistKey, items]);

  useEffect(() => {
    if (lastPersistenceScopeKey.current !== persistenceScopeKey) {
      hasInitializedPersistence.current = false;
      lastPersistenceScopeKey.current = persistenceScopeKey;
    }
  }, [persistenceScopeKey]);

  useEffect(() => {
    if (!persistKey || typeof window === 'undefined') {
      hasInitializedPersistence.current = true;
      return;
    }
    if (hasInitializedPersistence.current || items.length === 0) {
      return;
    }

    const storageKey = `rsx.tabs.${persistKey}`;
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (!storedValue) {
        return;
      }

      const storedItem = items.find((item) => item.value === storedValue);
      if (!storedItem || storedItem.disabled || storedItem.value === value) {
        return;
      }

      isApplyingStoredValue.current = true;
      onValueChange(storedItem.value);
    } catch {
      // Ignore storage availability/errors to keep tabs functional.
    } finally {
      hasInitializedPersistence.current = true;
    }
  }, [persistKey, items, onValueChange, value]);

  useEffect(() => {
    if (!persistKey || !hasInitializedPersistence.current) {
      return;
    }
    if (isApplyingStoredValue.current) {
      isApplyingStoredValue.current = false;
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = `rsx.tabs.${persistKey}`;
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // Ignore storage availability/errors to keep tabs functional.
    }
  }, [persistKey, value]);

  const activateIndex = (index: number): void => {
    if (index < 0 || index >= items.length) {
      return;
    }

    const nextItem = items[index];
    if (!nextItem || nextItem.disabled) {
      return;
    }

    onValueChange(nextItem.value);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        activateIndex(moveIndex(items, index, 1));
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        activateIndex(moveIndex(items, index, -1));
        break;
      }
      case 'Home': {
        event.preventDefault();
        activateIndex(firstEnabledIndex(items));
        break;
      }
      case 'End': {
        event.preventDefault();
        activateIndex(lastEnabledIndex(items));
        break;
      }
    }
  };

  const rootClassName = joinClassNames([unstyled ? undefined : 'rsxTabs', className]);
  const listClass = joinClassNames([
    unstyled ? undefined : 'rsxTabsList',
    listClassName,
  ]);

  return (
    <div className={rootClassName}>
      <div className={listClass} role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const itemClassName = joinClassNames([
            unstyled ? undefined : 'rsxTabsTrigger',
            tabClassName,
            isActive && !unstyled ? 'isActive' : undefined,
            isActive ? activeTabClassName : undefined,
          ]);
          const itemLabelClassName = joinClassNames([
            unstyled ? undefined : 'rsxTabsTriggerLabel',
            labelClassName,
          ]);

          return (
            <button
              key={item.value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={item.disabled}
              className={itemClassName}
              title={item.title}
              onClick={() => activateIndex(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              data-state={isActive ? 'active' : 'inactive'}
            >
              <span className={itemLabelClassName}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
