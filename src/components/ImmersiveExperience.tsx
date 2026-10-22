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

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useHeadTracking } from '@/hooks/useHeadTracking';
import { HEAD_TRACKING_CONFIG } from '@/lib/routeConfig';
import type { ResolvedWaypoint } from '@/types/waypoint';

// Lazy-load 3D scenes — only rendered when in view
const HeroScene = dynamic(
  () => import('@/components/HeroScene').then((m) => ({ default: m.HeroScene })),
  { ssr: false }
);
const ThreeScene = dynamic(
  () => import('@/components/ThreeScene').then((m) => ({ default: m.ThreeScene })),
  { ssr: false }
);

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        padding: '0 40px',
        height: 64,
        background: scrolled
          ? 'rgba(4, 4, 6, 0.92)'
          : 'linear-gradient(to bottom, rgba(4,4,6,0.75) 0%, transparent 100%)',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(204,0,0,0.25)' : '1px solid transparent',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease',
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
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="rgba(204,0,0,0.6)" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="7" stroke="rgba(200,168,75,0.7)" strokeWidth="1.2" />
          <circle cx="14" cy="14" r="3" fill="#cc0000" />
          <circle cx="14" cy="14" r="3" fill="#cc0000" style={{ filter: 'drop-shadow(0 0 4px #ff0000)' }} />
        </svg>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: '#f1f5f9',
          textTransform: 'uppercase',
        }}>
          IRON MAN
        </span>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {[
          { id: 'hero', label: 'SUIT' },
          { id: 'stats', label: 'SPECS' },
          { id: 'garage', label: 'GARAGE' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onScrollTo(id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.14em',
              color: 'rgba(241,245,249,0.7)',
              textTransform: 'uppercase',
              position: 'relative',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#cc0000';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(241,245,249,0.7)';
            }}
          >
            {label}
          </button>
        ))}

        {/* CTA */}
        <button
          onClick={() => onScrollTo('garage')}
          style={{
            padding: '8px 20px',
            background: 'transparent',
            border: '1px solid rgba(204,0,0,0.7)',
            color: '#cc0000',
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: 2,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(204,0,0,0.15)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(204,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          EXPLORE
        </button>
      </div>
    </nav>
  );
}

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
        fontFamily: "'Orbitron', monospace",
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
        fontFamily: "'Rajdhani', sans-serif",
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
  const [splashLoaded, setSplashLoaded] = useState(false);
  const [splashOut, setSplashOut] = useState(false);
  const [heroMounted, setHeroMounted] = useState(false);   // canvas exists (loads in bg)
  const [heroRevealed, setHeroRevealed] = useState(false); // canvas is visible
  const [garageVisible, setGarageVisible] = useState(false);

  const [resolvedWaypoints, setResolvedWaypoints] = useState<ResolvedWaypoint[]>([]);
  const [sensitivity, setSensitivity] = useState(HEAD_TRACKING_CONFIG.sensitivity);
  const [headEnabled, setHeadEnabled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const headActiveRef = useRef<boolean>(false);
  const jumpToWaypointRef = useRef<((index: number) => void) | null>(null);
  const progressRef = useRef<number>(0);
  const garageRef = useRef<HTMLDivElement>(null);

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

  // Reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Splash timer — mount canvas immediately so model pre-loads in background
  useEffect(() => {
    setHeroMounted(true);
    const t = setTimeout(() => setSplashLoaded(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const handleSplashOutComplete = useCallback(() => {
    setSplashOut(true);
    setHeroRevealed(true);
  }, []);

  // Lazy-load garage scene when scrolled into view
  useEffect(() => {
    if (!garageRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setGarageVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(garageRef.current);
    return () => observer.disconnect();
  }, [splashOut]);

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

  const handleWaypointsResolved = useCallback((wp: ResolvedWaypoint[]) => {
    setResolvedWaypoints(wp);
  }, []);

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
          {heroMounted && (
            <HeroScene
              headOffsetRef={headTracking.offsetRef}
              headActiveRef={headActiveRef}
              mousePosRef={{ current: { x: 0, y: 0 } } as any}
              prefersReducedMotion={prefersReducedMotion}
              isScanning={false}
            />
          )}
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

        {/* Hero text overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', justifyContent: 'center',
          padding: '0 60px',
          pointerEvents: 'none',
        }}>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: '#cc0000',
            textTransform: 'uppercase',
            marginBottom: 12,
            opacity: heroRevealed ? 1 : 0,
            transform: heroRevealed ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 1s ease 0.6s, transform 1s ease 0.6s',
          }}>
            STARK INDUSTRIES // MARK L
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 'clamp(48px, 7vw, 96px)',
            fontWeight: 900,
            lineHeight: 1.0,
            margin: 0,
            color: '#f1f5f9',
            letterSpacing: '-0.02em',
            opacity: heroRevealed ? 1 : 0,
            transform: heroRevealed ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 1s ease 0.8s, transform 1s ease 0.8s',
          }}>
            IRON<br />
            <span style={{
              background: 'linear-gradient(135deg, #cc0000, #ff3333 40%, #c8a84b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>MAN</span>
          </h1>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            color: 'rgba(241,245,249,0.55)',
            marginTop: 20,
            maxWidth: 320,
            lineHeight: 1.6,
            opacity: heroRevealed ? 1 : 0,
            transition: 'opacity 1s ease 1.1s',
          }}>
            The suit. The legend. Move your head to look around in real-time.
          </p>
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
                fontFamily: "'Rajdhani', sans-serif",
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
                <span style={{ fontFamily: "'Rajdhani'", fontSize: 11, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.1em' }}>SENSITIVITY</span>
                <input
                  type="range" min={0.1} max={4.0} step={0.05}
                  value={sensitivity}
                  onChange={(e) => setSensitivity(Number(e.target.value))}
                  style={{ accentColor: '#cc0000', width: 90, cursor: 'pointer' }}
                />
                <span style={{ fontFamily: "'Orbitron'", fontSize: 10, color: '#cc0000' }}>{sensitivity.toFixed(1)}x</span>
              </div>
            )}
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
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
          padding: '100px 60px',
          background: 'linear-gradient(to bottom, #000 0%, #06060a 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Background grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(204,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(204,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
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
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.3em',
            color: '#cc0000',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            ─── SUIT SPECIFICATIONS
          </div>
          <h2 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 'clamp(28px, 4vw, 52px)',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: '0 0 60px',
            letterSpacing: '0.03em',
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
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 22,
              fontStyle: 'italic',
              color: 'rgba(241,245,249,0.7)',
              margin: 0,
              lineHeight: 1.5,
            }}>
              &ldquo;The suit and I are one.&rdquo;
            </p>
            <div style={{
              fontFamily: "'Orbitron', monospace",
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
          {garageVisible && (
            <ThreeScene
              progressRef={progressRef}
              headOffsetRef={headTracking.offsetRef}
              headActiveRef={headActiveRef}
              onWaypointsResolved={handleWaypointsResolved}
              resolvedWaypoints={resolvedWaypoints}
              prefersReducedMotion={prefersReducedMotion}
              jumpToWaypointRef={jumpToWaypointRef}
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
            fontFamily: "'Rajdhani', sans-serif",
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
            fontFamily: "'Orbitron', monospace",
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
              fontFamily: "'Rajdhani', sans-serif",
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
              <span style={{ fontFamily: "'Rajdhani'", fontSize: 11, color: 'rgba(241,245,249,0.5)', letterSpacing: '0.1em' }}>SENSITIVITY</span>
              <input
                type="range" min={0.1} max={4.0} step={0.05}
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                style={{ accentColor: '#cc0000', width: 90, cursor: 'pointer' }}
              />
              <span style={{ fontFamily: "'Orbitron'", fontSize: 10, color: '#cc0000' }}>{sensitivity.toFixed(1)}x</span>
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
            fontFamily: "'Orbitron', monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: '#f1f5f9',
            marginBottom: 8,
          }}>
            STARK INDUSTRIES
          </div>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 12,
            letterSpacing: '0.2em',
            color: '#cc0000',
            marginBottom: 40,
          }}>
            ADVANCED WEAPONS & TECHNOLOGY
          </div>

          <p style={{
            fontFamily: "'Inter', sans-serif",
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
            fontFamily: "'Rajdhani', sans-serif",
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
