/**
 * ImmersiveExperience — the top-level client component.
 *
 * Configured for HEAD-TRACKING-ONLY mode:
 * - Scroll movement is removed.
 * - Camera is positioned at and facing the Blender "Empty" marker.
 * - Real-time webcam head-tracking creates the "window into 3D" parallax illusion.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { LoadingScreen } from '@/components/LoadingScreen';
import { HeadTrackingControls } from '@/components/HeadTrackingControls';
import { useHeadTracking } from '@/hooks/useHeadTracking';
import { HEAD_TRACKING_CONFIG } from '@/lib/routeConfig';
import type { ResolvedWaypoint } from '@/types/waypoint';

// Dynamically import the 3D canvas (client-only, heavy)
const ThreeScene = dynamic(
  () => import('@/components/ThreeScene').then((m) => ({ default: m.ThreeScene })),
  { ssr: false }
);

export function ImmersiveExperience() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [resolvedWaypoints, setResolvedWaypoints] = useState<ResolvedWaypoint[]>([]);
  const [sensitivity, setSensitivity] = useState(HEAD_TRACKING_CONFIG.sensitivity);
  const [invertMovement, setInvertMovement] = useState(
    HEAD_TRACKING_CONFIG.invertMovement ?? true
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Refs shared with the render loop
  const headActiveRef = useRef<boolean>(false);
  const jumpToWaypointRef = useRef<((index: number) => void) | null>(null);
  const progressRef = useRef<number>(0);

  const headTracking = useHeadTracking({
    ...HEAD_TRACKING_CONFIG,
    sensitivity,
    invertMovement,
    invertY: HEAD_TRACKING_CONFIG.invertY ?? true,
  });

  // Keep headActiveRef in sync with tracking state
  useEffect(() => {
    headActiveRef.current = headTracking.state.isActive;
  }, [headTracking.state.isActive]);

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleWaypointsResolved = useCallback((wp: ResolvedWaypoint[]) => {
    setResolvedWaypoints(wp);
    setIsLoaded(true);
  }, []);

  // Keyboard support for head tracking: H = toggle, R = recenter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (headTracking.state.isActive) {
          headTracking.disable();
        } else {
          headTracking.enable();
        }
      }
      if ((e.key === 'r' || e.key === 'R') && headTracking.state.isActive) {
        headTracking.recenter();
      }
      if (e.key === 'i' || e.key === 'I') {
        setInvertMovement((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [headTracking]);

  const activeWaypoint = resolvedWaypoints[0];

  return (
    <>
      {/* Loading overlay */}
      <LoadingScreen isLoaded={isLoaded} />

      {/* Fixed 3D canvas — covers entire viewport */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: '#020408',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <ThreeScene
          progressRef={progressRef}
          headOffsetRef={headTracking.offsetRef}
          headActiveRef={headActiveRef}
          onWaypointsResolved={handleWaypointsResolved}
          resolvedWaypoints={resolvedWaypoints}
          prefersReducedMotion={prefersReducedMotion}
          jumpToWaypointRef={jumpToWaypointRef}
        />
      </div>

      {/* Navigation overlay — fixed top bar */}
      <nav
        aria-label="Site navigation"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          background: 'linear-gradient(to bottom, rgba(2,4,8,0.85) 0%, rgba(2,4,8,0) 100%)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            pointerEvents: 'all',
          }}
        >
          {/* Logo */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #90cdf4, #3182ce)',
              boxShadow: '0 0 16px rgba(99, 179, 237, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            ✦
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: '#f7fafc',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
              }}
            >
              3D Environment
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#63b3ed',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span>Empty Camera View</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
              <span style={{ color: '#a0aec0' }}>Head-Track Only</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
            pointerEvents: 'all',
          }}
        >
          <HeadTrackingControls
            state={headTracking.state}
            onEnable={headTracking.enable}
            onDisable={headTracking.disable}
            onRecenter={headTracking.recenter}
            sensitivity={sensitivity}
            onSensitivityChange={setSensitivity}
            invertMovement={invertMovement}
            onToggleInvert={() => setInvertMovement((v) => !v)}
          />
        </div>
      </nav>

      {/* Floating Info HUD — bottom left */}
      {isLoaded && (
        <aside
          aria-label="Viewpoint information"
          style={{
            position: 'fixed',
            bottom: 24,
            left: 28,
            zIndex: 10,
            maxWidth: 380,
            background: 'rgba(3, 7, 18, 0.72)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '18px 22px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'all',
            fontFamily: "'Inter', system-ui, sans-serif",
            animation: 'hud-fade-in 0.5s ease-out forwards',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#63b3ed',
                fontWeight: 600,
              }}
            >
              Blender Camera Waypoint
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: headTracking.state.isActive ? '#48bb78' : '#a0aec0',
                fontFamily: 'monospace',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: headTracking.state.isActive ? '#48bb78' : '#718096',
                  boxShadow: headTracking.state.isActive
                    ? '0 0 8px #48bb78'
                    : 'none',
                }}
              />
              {headTracking.state.isActive ? 'Tracking Active' : 'Head Track Idle'}
            </span>
          </div>

          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 18,
              fontWeight: 600,
              color: '#f7fafc',
            }}
          >
            Focal Depth Parallax
          </h2>

          <p
            style={{
              margin: '0 0 14px',
              fontSize: 13,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            The camera is locked onto the central focus of the scene. Moving your head produces true physical depth parallax: peek around the center as foreground and background shift in opposing perspective.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              fontSize: 11,
              fontFamily: 'monospace',
            }}
          >
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e0',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              ⌨️ <b style={{ color: '#fff' }}>H</b> Toggle Track
            </div>
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e0',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              🎯 <b style={{ color: '#fff' }}>R</b> Recenter
            </div>
            <div
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: invertMovement
                  ? 'rgba(99, 179, 237, 0.12)'
                  : 'rgba(255,255,255,0.06)',
                color: invertMovement ? '#90cdf4' : '#cbd5e0',
                border: `1px solid ${invertMovement ? 'rgba(99, 179, 237, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
              }}
              onClick={() => setInvertMovement((v) => !v)}
              title="Click or press 'I' to toggle movement inversion"
            >
              ⇅ <b style={{ color: '#fff' }}>I</b> Invert: {invertMovement ? 'ON' : 'OFF'}
            </div>
            {activeWaypoint && (
              <div
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'rgba(99, 179, 237, 0.1)',
                  color: '#90cdf4',
                  border: '1px solid rgba(99, 179, 237, 0.2)',
                }}
              >
                Pos: [{activeWaypoint.worldPosition.map((v) => v.toFixed(2)).join(', ')}]
              </div>
            )}
          </div>
        </aside>
      )}

      {/* WebGL unavailable fallback */}
      <noscript>
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020408',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: 18,
            zIndex: 9999,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 400, padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ marginBottom: 12 }}>JavaScript Required</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              This immersive 3D experience requires JavaScript and WebGL. Please
              enable JavaScript in your browser settings.
            </p>
          </div>
        </div>
      </noscript>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        html, body {
          overflow: hidden;
          height: 100%;
          width: 100%;
        }
        @keyframes hud-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
