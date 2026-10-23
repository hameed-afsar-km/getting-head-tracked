/**
 * useInView — tracks whether an element is inside the viewport.
 *
 * Returns the current intersection state (used to pause GPU work) and a
 * sticky "has ever been in view" flag (used to lazy-mount scenes).
 */

'use client';

import { useEffect, useState } from 'react';

export interface UseInViewOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useInView<T extends Element>(
  ref: React.RefObject<T | null>,
  { rootMargin = '0px', threshold = 0 }: UseInViewOptions = {}
): [inView: boolean, hasBeenInView: boolean] {
  const [inView, setInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenInView(true);
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return [inView, hasBeenInView];
}
