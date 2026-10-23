/**
 * ImmersiveExperience — Iron Man themed website
 *
 * Structure:
 *  1. LoadingScreen   — splash with red spinner
 *  2. Navbar          — fixed, semi-transparent Iron Man HUD
 *  3. HeroSection     — hero2.glb fullscreen + head tracking CTA
 *  4. StatsSection    — Iron Man HUD stats cards (CSS only, zero GPU)
 *  5. GarageSection   — 3d.glb scene + head tracking
 *  6. FooterSection   — Iron Man quote + links
 */

'use client';

import { useState, useRef, useCallback, useEffect, memo, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useHeadTracking } from '@/hooks/useHeadTracking';
import { useInView } from '@/hooks/useInView';
import { HEAD_TRACKING_CONFIG } from '@/lib/routeConfig';

// Lazy-load 3D scenes — only rendered when in view
const HeroScene = dynamic(
  () => import('@/components/HeroScene').then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);
const ThreeScene = dynamic(
  () => import('@/components/ThreeScene').then((m) => ({ default: m.ThreeScene })),
  { ssr: false }
);

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

const Navbar = memo(function Navbar({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: 76,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.98) 0%, rgba(30,0,0,0.98) 50%, rgba(0,0,0,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid rgba(255,0,0,0.6)',
        boxShadow: '0 10px 60px rgba(255,0,0,0.3), inset 0 -1px 0 rgba(255,0,0,0.4)',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => onScrollTo('hero')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 0,
        }}
      >
        {/* Arc reactor icon */}
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M18 3 L31 10 L31 26 L18 33 L5 26 L5 10 Z" stroke="#ff0000" strokeWidth="2" fill="none" />
          <path d="M18 3 L31 10 L18 18 L5 10 Z" stroke="#ff0000" strokeWidth="1.5" fill="rgba(255,0,0,0.1)" />
          <circle cx="18" cy="18" r="4" fill="#ff0000" style={{ filter: 'drop-shadow(0 0 10px #ff0000)' }} />
        </svg>
        <span style={{
          fontFamily: "'Tourney', 'Impact', sans-serif",
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: '0.22em',
          color: '#ff0000',
          textTransform: 'uppercase',
          textShadow: '0 0 30px rgba(255,0,0,0.7)',
        }}>
          IRON MAN
        </span>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        {[
          { id: 'hero', label: 'ARMOR' },
          { id: 'stats', label: 'SPECIFICATIONS' },
          { id: 'garage', label: 'HANGAR' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onScrollTo(id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '10px 0',
              fontFamily: "'Tourney', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: 'rgba(255,255,255,0.8)',
              textTransform: 'uppercase',
              position: 'relative',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = '#ff0000';
              btn.style.textShadow = '0 0 15px rgba(255,0,0,0.8)';
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.color = 'rgba(255,255,255,0.8)';
              btn.style.textShadow = 'none';
            }}
          >
            {label}
          </button>
        ))}

        <button
          onClick={() => onScrollTo('garage')}
          style={{
            padding: '10px 28px',
            background: 'linear-gradient(135deg, #ff0000 0%, #8b0000 100%)',
            border: '1px solid #ff0000',
            color: '#fff',
            fontFamily: "'Tourney', sans-serif",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            transition: 'all 0.3s',
            boxShadow: '0 0 30px rgba(255,0,0,0.4)',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.boxShadow = '0 0 50px rgba(255,0,0,0.7)';
            btn.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.boxShadow = '0 0 30px rgba(255,0,0,0.4)';
            btn.style.transform = 'scale(1)';
          }}
        >
          ENGAGE
        </button>
      </div>
    </nav>
  );
});

// ─── HUD stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, icon, color = '#cc0000' }: {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  color?: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '28px 32px',
        background: 'rgba(6,6,10,0.85)',
        border: '1px solid rgba(204,0,0,0.2)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 4,
        overflow: 'hidden',
        flex: '1 1 220px',
        minWidth: 200,
        maxWidth: 300,
        transition: 'transform 0.3s, border-color 0.3s',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.borderColor = `rgba(${color === '#c8a84b' ? '200,168,75' : '204,0,0'},0.5)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.borderColor = 'rgba(204,0,0,0.2)';
      }}
    >
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />

      {/* Glow stripe */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.7,
      }} />

      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      <div style={{
        fontFamily: "var(--font-orbitron), monospace",
        fontSize: 32,
        fontWeight: 700,
        color: '#f1f5f9',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(241,245,249,0.5)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{
        fontFamily: "var(--font-rajdhani), sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.18em',
        color: 'rgba(241,245,249,0.45)',
        textTransform: 'uppercase',
        marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImmersiveExperience() {
  const [splashOut, setSplashOut] = useState(false);
  const [heroRevealed, setHeroRevealed] = useState(false); // canvas is visible
  const [heroReady, setHeroReady] = useState(false);       // hero GLB fully loaded
  const [splashMinTimePassed, setSplashMinTimePassed] = useState(false);
  const [splashForced, setSplashForced] = useState(false);

  const [sensitivity, setSensitivity] = useState(HEAD_TRACKING_CONFIG.sensitivity);
  const [headEnabled, setHeadEnabled] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const headActiveRef = useRef<boolean>(false);
  const noMousePosRef = useRef({ x: 0, y: 0 });

  const heroRef = useRef<HTMLElement>(null);
  const [heroInView] = useInView(heroRef);
  const garageRef = useRef<HTMLDivElement>(null);
  const [garageInView, garageHasBeenInView] = useInView(garageRef, {
    rootMargin: '200px',
  });

  const headTracking = useHeadTracking({
    ...HEAD_TRACKING_CONFIG,
    sensitivity,
    invertMovement: HEAD_TRACKING_CONFIG.invertMovement ?? true,
    invertY: HEAD_TRACKING_CONFIG.invertY ?? true,
  });

  // Sync active ref
  useEffect(() => {
    headActiveRef.current = headTracking.state.isActive && headEnabled;
  }, [headTracking.state.isActive, headEnabled]);

  // Mount timer starts immediately so the model pre-loads behind the splash.
  useEffect(() => {
    const t = setTimeout(() => setSplashMinTimePassed(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Never trap the user behind a stalled or failed model fetch.
  useEffect(() => {
    const t = setTimeout(() => setSplashForced(true), 15000);
    return () => clearTimeout(t);
  }, []);

  const splashLoaded = splashForced || (heroReady && splashMinTimePassed);

  const handleHeroReady = useCallback(() => setHeroReady(true), []);

  // Prefetch the garage model + chunk while the browser is idle after the hero loads.
  useEffect(() => {
    if (!heroReady) return;
    const prefetch = () => {
      void import('@/components/ThreeScene');
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetch, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetch, 3000);
    return () => window.clearTimeout(id);
  }, [heroReady]);

  const handleSplashOutComplete = useCallback(() => {
    setSplashOut(true);
    setHeroRevealed(true);
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const toggleHead = useCallback(() => {
    if (headTracking.state.isActive) {
      headTracking.disable();
      setHeadEnabled(false);
    } else {
      headTracking.enable().catch(() => {});
      setHeadEnabled(true);
    }
  }, [headTracking]);

  const isTracking = headTracking.state.isActive && headEnabled;

  return (
    <>
      {/* ── Splash ─────────────────────────────────────────────── */}
      {!splashOut && (
        <LoadingScreen isLoaded={splashLoaded} onOutComplete={handleSplashOutComplete} />
      )}

      {/* ── Navbar ─────────────────────────────────────────────── */}
      {splashOut && <Navbar onScrollTo={scrollTo} />}

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — HERO (hero2.glb)
      ════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {/* 3D canvas — mounted during splash, revealed after */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: heroRevealed ? 1 : 0,
          transition: 'opacity 1.4s ease',
        }}>
          <HeroScene
            headOffsetRef={headTracking.offsetRef}
            headActiveRef={headActiveRef}
            mousePosRef={noMousePosRef}
            prefersReducedMotion={prefersReducedMotion}
            isScanning={false}
            active={heroInView || !splashOut}
            onReady={handleHeroReady}
          />
        </div>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom fade into next section */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
          background: 'linear-gradient(to bottom, transparent, #000)',
          pointerEvents: 'none',
        }} />

        {/* Hero text overlay - 3 column layout, center column clear */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 8%',
            opacity: heroRevealed ? 1 : 0,
            transform: heroRevealed ? 'translateX(0)' : 'translateX(-30px)',
            transition: 'opacity 1.3s ease 0.6s, transform 1.3s ease 0.6s',
          }}>
            <div style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.4em',
              color: '#ff0000',
              textTransform: 'uppercase',
              marginBottom: 18,
              textShadow: '0 0 40px rgba(255,0,0,0.7)',
            }}>
              STARK INDUSTRIES
            </div>
          <div style={{
            fontFamily: "'Tourney', 'Impact', 'Arial Black', sans-serif",
            fontSize: 'clamp(70px, 10vw, 140px)',
            fontWeight: 900,
            lineHeight: 0.8,
            letterSpacing: '0.15em',
            color: '#ff0000',
            textTransform: 'uppercase',
            textShadow: '0 0 80px rgba(255,0,0,0.6), 20px 20px 60px rgba(0,0,0,0.9)',
            WebkitTextStroke: '2px rgba(255,255,255,0.1)',
          }}>
            IRON
          </div>
            <div style={{
              fontFamily: "var(--font-orbitron), monospace",
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 14,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              MARK L
            </div>
          </div>
          <div />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            textAlign: 'right',
            padding: '0 8%',
            opacity: heroRevealed ? 1 : 0,
            transform: heroRevealed ? 'translateX(0)' : 'translateX(30px)',
            transition: 'opacity 1.3s ease 0.7s, transform 1.3s ease 0.7s',
          }}>
            <div style={{
              fontFamily: "'Tourney', 'Impact', 'Arial Black', sans-serif",
              fontSize: 'clamp(70px, 10vw, 140px)',
              fontWeight: 900,
              lineHeight: 0.8,
              letterSpacing: '0.15em',
              color: '#ff0000',
              textTransform: 'uppercase',
              textShadow: '0 0 80px rgba(255,0,0,0.6), -20px 20px 60px rgba(0,0,0,0.9)',
              WebkitTextStroke: '2px rgba(255,255,255,0.1)',
            }}>
              MAN
            </div>
            <div style={{
              fontFamily: "var(--font-orbitron), monospace",
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 14,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              ARC REACTOR
            </div>
          </div>
        </div>

        {/* Head tracking button — bottom center */}
        {heroRevealed && (
          <div style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <button
              id="hero-head-tracking-btn"
              onClick={toggleHead}
              style={{
                padding: '12px 28px',
                background: isTracking ? 'rgba(204,0,0,0.15)' : 'rgba(255,255,255,0.06)',
                color: isTracking ? '#ff4444' : 'rgba(241,245,249,0.85)',
                border: `1px solid ${isTracking ? 'rgba(204,0,0,0.6)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: "var(--font-rajdhani), sans-serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s',
                boxShadow: isTracking ? '0 0 24px rgba(204,0,0,0.3)' : 'none',
              }}
            >
              {isTracking ? '⊙ HEAD TRACKING ON' : '⊙ ENABLE HEAD TRACKING'}
            </button>
            {isTracking && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(4,4,6,0.7)',
                padding: '6px 14px',
                borderRadius: 2,
                border: '1px solid rgba(204,0,0,0.15)',
              }}>
                <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: 11, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.1em' }}>SENSITIVITY</span>
                <input
                  type="range" min={0.1} max={4.0} step={0.05}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  style={{ accentColor: '#cc0000', width: 90, cursor: 'pointer' }}
                />
                <span style={{ fontFamily: "var(--font-orbitron)", fontSize: 10, color: '#cc0000' }}>{sensitivity.toFixed(1)}x</span>
              </div>
            )}
            <div style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              fontSize: 11,
              letterSpacing: '0.12em',
              color: 'rgba(241,245,249,0.3)',
              textTransform: 'uppercase',
            }}>
              SCROLL TO EXPLORE
            </div>
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — SPECS / STATS (pure CSS, zero GPU cost)
      ════════════════════════════════════════════════════════ */}
      <section
        id="stats"
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          padding: '140px 60px 100px',
          background: 'radial-gradient(ellipse at center, #0a0000 0%, #000000 70%)',
          overflow: 'hidden',
        }}
      >
        {/* Background grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.06) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          pointerEvents: 'none',
        }} />

        {/* Red glow orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600,
          background: 'radial-gradient(ellipse, rgba(204,0,0,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          {/* Section label */}
          <div style={{
            fontFamily: "'Tourney', sans-serif",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.5em',
            color: '#ff0000',
            textTransform: 'uppercase',
            marginBottom: 18,
            textShadow: '0 0 30px rgba(255,0,0,0.6)',
          }}>
            ◆ SUIT SPECIFICATIONS ◆
          </div>
          <h2 style={{
            fontFamily: "'Tourney', 'Impact', sans-serif",
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: '2px #ff0000',
            margin: '0 0 70px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textShadow: '0 0 60px rgba(255,0,0,0.4)',
          }}>
            MARK L DIAGNOSTICS
          </h2>

          {/* Stat cards grid */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            justifyContent: 'center',
          }}>
            <StatCard icon="⚡" label="Arc Reactor Output" value="3 GW" color="#cc0000" />
            <StatCard icon="🚀" label="Max Flight Speed" value="Mach 3" color="#cc0000" />
            <StatCard icon="🛡️" label="Titanium-Gold Alloy" value="12mm" unit="armor" color="#c8a84b" />
            <StatCard icon="🎯" label="AI Targeting Latency" value="0.3" unit="ms" color="#c8a84b" />
            <StatCard icon="🧠" label="J.A.R.V.I.S. Threads" value="4096" color="#cc0000" />
            <StatCard icon="🌡️" label="Suit Temp Tolerance" value="3000" unit="°C" color="#c8a84b" />
          </div>

          {/* Quote */}
          <div style={{
            marginTop: 80,
            padding: '32px 40px',
            borderLeft: '3px solid #cc0000',
            background: 'rgba(204,0,0,0.05)',
          }}>
            <p style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              fontSize: 22,
              fontStyle: 'italic',
              color: 'rgba(241,245,249,0.7)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              &ldquo;The suit and I are one.&rdquo;
            </p>
            <div style={{
              fontFamily: "var(--font-orbitron), monospace",
              fontSize: 11,
              color: '#cc0000',
              marginTop: 12,
              letterSpacing: '0.15em',
            }}>
              — TONY STARK, AVENGERS: INFINITY WAR
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 3 — GARAGE (3d.glb)
      ════════════════════════════════════════════════════════ */}
      <section
        id="garage"
        ref={garageRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        {/* 3D canvas */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {garageHasBeenInView && (
            <ThreeScene
              headOffsetRef={headTracking.offsetRef}
              headActiveRef={headActiveRef}
              prefersReducedMotion={prefersReducedMotion}
              active={garageInView}
            />
          )}
        </div>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.65) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Top fade */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 160,
          background: 'linear-gradient(to bottom, #000, transparent)',
          pointerEvents: 'none',
        }} />

        {/* Label */}
        <div style={{
          position: 'absolute',
          top: 88,
          left: 60,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.28em',
            color: '#cc0000',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            ─── MALIBU COMPOUND
          </div>
          <h2 style={{
            fontFamily: "var(--font-orbitron), monospace",
            fontSize: 'clamp(24px, 3.5vw, 48px)',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: 0,
            letterSpacing: '0.02em',
          }}>
            THE GARAGE
          </h2>
        </div>

        {/* Head tracking control — bottom */}
        <div style={{
          position: 'absolute',
          bottom: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          <button
            id="garage-head-tracking-btn"
            onClick={toggleHead}
            style={{
              padding: '10px 24px',
              background: isTracking ? 'rgba(204,0,0,0.15)' : 'rgba(255,255,255,0.06)',
              color: isTracking ? '#ff4444' : 'rgba(241,245,249,0.8)',
              border: `1px solid ${isTracking ? 'rgba(204,0,0,0.6)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 2,
              cursor: 'pointer',
              fontFamily: "var(--font-rajdhani), sans-serif",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.25s',
              boxShadow: isTracking ? '0 0 20px rgba(204,0,0,0.25)' : 'none',
            }}
          >
            {isTracking ? '⊙ HEAD TRACKING ON' : '⊙ ENABLE HEAD TRACKING'}
          </button>
          {isTracking && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(4,4,6,0.7)', padding: '5px 12px',
              borderRadius: 2, border: '1px solid rgba(204,0,0,0.15)',
            }}>
              <span style={{ fontFamily: "var(--font-rajdhani)", fontSize: 11, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.1em' }}>SENSITIVITY</span>
              <input
                type="range" min={0.1} max={4.0} step={0.05}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                style={{ accentColor: '#cc0000', width: 90, cursor: 'pointer' }}
              />
              <span style={{ fontFamily: "var(--font-orbitron)", fontSize: 10, color: '#cc0000' }}>{sensitivity.toFixed(1)}x</span>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 4 — FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{
        position: 'relative',
        width: '100%',
        padding: '80px 60px 60px',
        background: '#000',
        borderTop: '1px solid rgba(204,0,0,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(204,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(204,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Logo large */}
          <div style={{ marginBottom: 24 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="rgba(204,0,0,0.5)" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="13" stroke="rgba(200,168,75,0.5)" strokeWidth="1" />
              <circle cx="24" cy="24" r="6" fill="#cc0000" style={{ filter: 'drop-shadow(0 0 8px #ff0000)' }} />
            </svg>
          </div>

          <div style={{
            fontFamily: "var(--font-orbitron), monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: '#f1f5f9',
            marginBottom: 8,
          }}>
            STARK INDUSTRIES
          </div>
          <div style={{
            fontFamily: "var(--font-rajdhani), sans-serif",
            fontSize: 12,
            letterSpacing: '0.2em',
            color: '#cc0000',
            marginBottom: 40,
          }}>
            ADVANCED WEAPONS & TECHNOLOGY
          </div>

          <p style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 13,
            color: 'rgba(241,245,249,0.3)',
            maxWidth: 480,
            lineHeight: 1.7,
            margin: 0,
          }}>
            Immersive Iron Man experience with real-time WebCam head tracking powered by MediaPipe &amp; Three.js.
            Move your head — the 3D world responds.
          </p>

          <div style={{
            marginTop: 48,
            fontFamily: "var(--font-rajdhani), sans-serif",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: 'rgba(241,245,249,0.2)',
            textTransform: 'uppercase',
          }}>
            © 2026 — Head-Tracked 3D Experience
          </div>
        </div>
      </footer>

      {/* Global scroll styles */}
      <style>{`
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
      `}</style>
    </>
  );
}
