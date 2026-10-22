/**
 * LoadingScreen — displayed while the GLB is loading.
 * Fades out once the model is ready.
 */

'use client';

import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  isLoaded: boolean;
}

export function LoadingScreen({ isLoaded }: LoadingScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && overlayRef.current) {
      overlayRef.current.style.opacity = '0';
      overlayRef.current.style.pointerEvents = 'none';
    }
  }, [isLoaded]);

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020408',
        transition: 'opacity 0.8s ease',
        pointerEvents: 'all',
      }}
    >
      {/* Animated logo/orb */}
      <div
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(99, 179, 237, 0.4)',
            animation: 'pulse-ring 2s ease-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            border: '2px solid rgba(99, 179, 237, 0.7)',
            animation: 'pulse-ring 2s ease-out infinite 0.4s',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #63b3ed, #3182ce)',
            boxShadow: '0 0 20px rgba(99, 179, 237, 0.6)',
            animation: 'breathe 2s ease-in-out infinite',
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 13,
          letterSpacing: '0.2em',
          color: 'rgba(99, 179, 237, 0.8)',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}
      >
        Loading Environment
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 200,
          height: 2,
          background: 'rgba(99, 179, 237, 0.15)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #3182ce, #63b3ed)',
            borderRadius: 1,
            animation: 'loading-bar 2s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.7; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
