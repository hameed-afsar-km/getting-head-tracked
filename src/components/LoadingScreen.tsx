'use client';

import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  isLoaded: boolean;
  onOutComplete?: () => void;
}

export function LoadingScreen({ isLoaded, onOutComplete }: LoadingScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && !startedRef.current) {
      startedRef.current = true;
      if (overlayRef.current) {
        overlayRef.current.style.transition =
          'transform 0.9s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.9s ease';
        overlayRef.current.style.transform = 'scale(1.06)';
        overlayRef.current.style.opacity = '0';
        overlayRef.current.style.pointerEvents = 'none';
        const t = setTimeout(() => {
          onOutComplete?.();
        }, 950);
        return () => clearTimeout(t);
      }
      onOutComplete?.();
    }
  }, [isLoaded, onOutComplete]);

  return (
    <div className="loader" ref={overlayRef}>
      <div className="loader-inner">
        <div className="loader-reactor" aria-hidden="true">
          <div className="loader-ring r1" />
          <div className="loader-ring r2" />
          <div className="loader-ring r3" />
          <div className="loader-core" />
        </div>

        <div className="loader-wordmark">Stark</div>

        <div
          className="loader-status"
          role="status"
          aria-live="polite"
        >
          {isLoaded ? 'Systems online' : 'Initializing armor'}
        </div>

        <div className="loader-track" aria-hidden="true" />
      </div>

      <div className="loader-foot">
        <span>Mark L // Arc Division</span>
        <span>Malibu · 34.0259° N</span>
      </div>
    </div>
  );
}
