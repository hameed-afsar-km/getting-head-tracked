/**
 * useScrollProgress — GSAP ScrollTrigger hook.
 *
 * Drives a normalized [0..1] scroll progress value through a tall
 * scrollable container. Exposes the current value via a ref (no
 * per-frame React state) so the animation loop can read it without
 * triggering re-renders.
 */

'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface ScrollProgressApi {
  /** Current normalized scroll progress [0..1] */
  progressRef: React.RefObject<number>;
  /** Set this ref on the scrollable container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollProgress(): ScrollProgressApi {
  const progressRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        progressRef.current = self.progress;
      },
    });

    triggerRef.current = trigger;

    return () => {
      trigger.kill();
      triggerRef.current = null;
    };
  }, []);

  return { progressRef, containerRef };
}
