"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export function usePersistentStringOption<T extends string>(
  storageKey: string,
  defaultValue: T,
  options: readonly T[],
): [T, Dispatch<SetStateAction<T>>] {
  const validOptions = useMemo(() => new Set<string>(options), [options]);
  const [value, setValue] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(storageKey);

      if (storedValue && validOptions.has(storedValue)) {
        setValue(storedValue as T);
      }
    } catch {
      setValue(defaultValue);
    } finally {
      setIsHydrated(true);
    }
  }, [defaultValue, storageKey, validOptions]);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      return;
    }
  }, [isHydrated, storageKey, value]);

  return [value, setValue];
}
