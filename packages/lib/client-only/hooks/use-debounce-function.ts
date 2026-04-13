import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounces a function call by `delay` ms. Latest call wins; previous timer is cleared.
 */
export const useDebounceFunction = <Args extends readonly unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number,
): ((...args: Args) => void) => {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debounced = useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        void fnRef.current(...args);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debounced;
};
