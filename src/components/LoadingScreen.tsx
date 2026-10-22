/**
 * LoadingScreen — animated splash screen with red loader.
 * Unique out transition.
 */

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
        overlayRef.current.style.transition = 'transform 0.9s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.9s ease';
        overlayRef.current.style.transform = 'scale(1.08)';
        overlayRef.current.style.opacity = '0';
        overlayRef.current.style.pointerEvents = 'none';
        const t = setTimeout(() => {
          if (onOutComplete) onOutComplete();
        }, 950);
        return () => clearTimeout(t);
      }
      if (onOutComplete) onOutComplete();
    }
  }, [isLoaded, onOutComplete]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000000',
        transition: 'opacity 0.8s ease',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 64,
          height: 64,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid rgba(255, 0, 0, 0.25)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#ff0000',
            animation: 'spin 0.9s linear infinite',
            filter: 'drop-shadow(0 0 12px rgba(255, 0, 0, 0.6))',
          }}
        />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
