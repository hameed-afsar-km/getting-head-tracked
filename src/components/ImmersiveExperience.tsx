'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  useSyncExternalStore,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import dynamic from 'next/dynamic';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useHeadTracking } from '@/hooks/useHeadTracking';
import { useInView } from '@/hooks/useInView';
import { HEAD_TRACKING_CONFIG } from '@/lib/routeConfig';

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

const NAV_ITEMS = [
  { id: 'hero', label: 'Armor', index: '01' },
  { id: 'stats', label: 'Specifications', index: '02' },
  { id: 'garage', label: 'Hangar', index: '03' },
];

const SPECS = [
  {
    name: 'Max Flight Speed',
    sub: 'Repulsor thrust · supersonic',
    value: 'Mach 3',
    unit: '',
  },
  {
    name: 'Titanium-Gold Alloy',
    sub: 'Nano-lattice plating',
    value: '12',
    unit: 'mm',
  },
  {
    name: 'AI Targeting Latency',
    sub: 'J.A.R.V.I.S. optical loop',
    value: '0.3',
    unit: 'ms',
  },
  {
    name: 'Neural Threads',
    sub: 'Parallel decision engines',
    value: '4096',
    unit: '',
  },
  {
    name: 'Temperature Tolerance',
    sub: 'Re-entry survivability',
    value: '3000',
    unit: '°C',
  },
  {
    name: 'Repulsor Yield',
    sub: 'Per-palm output',
    value: '2.4',
    unit: 'GJ',
  },
];

function ReactorMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 2.5 31.5 10v16L18 33.5 4.5 26V10Z"
        stroke="rgba(201,164,92,0.65)"
        strokeWidth="1"
      />
      <circle cx="18" cy="18" r="9.5" stroke="rgba(255,59,68,0.55)" strokeWidth="0.8" />
      <circle cx="18" cy="18" r="5.5" stroke="rgba(236,232,223,0.35)" strokeWidth="0.8" />
      <circle cx="18" cy="18" r="2.6" fill="#ff3b44" />
    </svg>
  );
}

const Navbar = memo(function Navbar({
  onScrollTo,
}: {
  onScrollTo: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen]);

  const navigate = (id: string) => {
    setMenuOpen(false);
    onScrollTo(id);
  };

  return (
    <>
      <nav className="nav">
        <button className="brand" onClick={() => navigate('hero')} aria-label="Stark Industries home">
          <ReactorMark />
          <span className="brand-text">
            <span className="brand-name">Stark</span>
            <span className="brand-sub">Industries</span>
          </span>
        </button>

        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className="nav-link"
              onClick={() => navigate(item.id)}
            >
              <span>{item.index}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <button className="btn-primary" onClick={() => navigate('garage')}>
            Enter Hangar
          </button>
          <button
            className={`nav-burger ${menuOpen ? 'is-open' : ''}`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu" id="mobile-menu">
          <div className="mobile-links">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className="mobile-link"
                onClick={() => navigate(item.id)}
              >
                <span>{item.index}</span>
                {item.label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => navigate('garage')}>
            Enter Hangar
          </button>
        </div>
      )}
    </>
  );
});

function TrackingControl({
  isTracking,
  onToggle,
  sensitivity,
  onSensitivityChange,
}: {
  isTracking: boolean;
  onToggle: () => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
}) {
  return (
    <div className={`track-control ${isTracking ? 'is-on' : ''}`}>
      <button
        className="track-btn"
        onClick={onToggle}
        aria-pressed={isTracking}
      >
        <span className="track-dot" aria-hidden="true" />
        {isTracking ? 'Tracking Active' : 'Enable Head Tracking'}
      </button>

      {isTracking && (
        <div className="track-sens">
          <span className="track-sens-label">Sens</span>
          <input
            type="range"
            min={0.1}
            max={4.0}
            step={0.05}
            value={sensitivity}
            onChange={(event) => onSensitivityChange(Number(event.target.value))}
            aria-label="Head tracking sensitivity"
          />
          <span className="track-sens-value">{sensitivity.toFixed(1)}x</span>
        </div>
      )}
    </div>
  );
}

function SpecificationRow({
  index,
  name,
  sub,
  value,
  unit,
}: {
  index: number;
  name: string;
  sub: string;
  value: string;
  unit: string;
}) {
  return (
    <article className="spec-row">
      <span className="spec-row-index">{String(index).padStart(2, '0')}</span>
      <div>
        <h3 className="spec-row-name">{name}</h3>
        <p className="spec-row-sub">{sub}</p>
      </div>
      <span className="spec-row-value">
        {value}
        {unit && <span>{unit}</span>}
      </span>
    </article>
  );
}

export function ImmersiveExperience() {
  const [splashOut, setSplashOut] = useState(false);
  const [heroRevealed, setHeroRevealed] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [splashMinTimePassed, setSplashMinTimePassed] = useState(false);
  const [splashForced, setSplashForced] = useState(false);

  const [sensitivity, setSensitivity] = useState(HEAD_TRACKING_CONFIG.sensitivity);
  const [headEnabled, setHeadEnabled] = useState(false);

  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const headActiveRef = useRef(false);
  const mousePosRef = useRef({ x: 0, y: 0 });

  const heroRef = useRef<HTMLElement>(null);
  const [heroInView] = useInView(heroRef);

  const statsRef = useRef<HTMLElement>(null);
  const [statsInView] = useInView(statsRef, { threshold: 0.14 });
  const featureValueRef = useRef<HTMLSpanElement>(null);
  const progressFillRef = useRef<HTMLSpanElement>(null);

  const garageRef = useRef<HTMLDivElement>(null);
  const [garageInView, garageHasBeenInView] = useInView(garageRef, {
    rootMargin: '500px',
    threshold: 0.12,
  });

  const headTracking = useHeadTracking({
    ...HEAD_TRACKING_CONFIG,
    sensitivity,
    invertMovement: HEAD_TRACKING_CONFIG.invertMovement ?? true,
    invertY: HEAD_TRACKING_CONFIG.invertY ?? true,
  });

  useEffect(() => {
    headActiveRef.current = headTracking.state.isActive && headEnabled;
  }, [headTracking.state.isActive, headEnabled]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      mousePosRef.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: (event.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const section = statsRef.current;
    if (!section) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    const init = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);

      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const context = gsap.context(() => {
        const feature = section.querySelector<HTMLElement>('.spec-feature');
        const list = section.querySelector<HTMLElement>('.spec-list');
        const title = section.querySelector<HTMLElement>('.specs-title');
        const rows = gsap.utils.toArray<HTMLElement>('.spec-row', section);

        if (title) {
          gsap.fromTo(
            title,
            { y: 58 },
            {
              y: -36,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.1,
              },
            }
          );
        }

        if (feature) {
          gsap.fromTo(
            '.reactor',
            { scale: 0.68, rotation: -18 },
            {
              scale: 1,
              rotation: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: feature,
                start: 'top 92%',
                end: 'center 48%',
                scrub: 1,
              },
            }
          );

          gsap.fromTo(
            '.spec-feature-body',
            { y: 44, opacity: 0.25 },
            {
              y: 0,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: feature,
                start: 'top 90%',
                end: 'center 52%',
                scrub: 1,
              },
            }
          );

          const counter = { value: 0 };
          gsap.to(counter, {
            value: 3,
            ease: 'none',
            scrollTrigger: {
              trigger: feature,
              start: 'top 88%',
              end: 'center 52%',
              scrub: 1,
            },
            onUpdate: () => {
              if (featureValueRef.current) {
                featureValueRef.current.textContent = counter.value.toFixed(1);
              }
            },
          });
        }

        if (progressFillRef.current) {
          gsap.fromTo(
            progressFillRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: section,
                start: 'top 68%',
                end: 'bottom 68%',
                scrub: 1,
              },
            }
          );
        }

        if (list && rows.length) {
          gsap.from(rows, {
            x: 46,
            opacity: 0,
            duration: 0.75,
            stagger: 0.07,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: list,
              start: 'top 84%',
              toggleActions: 'play none none reverse',
            },
          });
        }

        rows.forEach((row) => {
          ScrollTrigger.create({
            trigger: row,
            start: 'top 74%',
            end: 'bottom 46%',
            onToggle: (self) => row.classList.toggle('is-active', self.isActive),
          });
        });
      }, section);

      revert = () => context.revert();
    };

    void init();

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [prefersReducedMotion]);

  const handleFeatureMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;

      el.style.setProperty('--mx', `${(px * 100).toFixed(2)}%`);
      el.style.setProperty('--my', `${(py * 100).toFixed(2)}%`);

      if (prefersReducedMotion) return;
      const tilt = el.querySelector<HTMLElement>('.spec-feature-tilt');
      if (tilt) {
        tilt.style.transform = `rotateX(${((0.5 - py) * 7).toFixed(2)}deg) rotateY(${((px - 0.5) * 9).toFixed(2)}deg)`;
      }
    },
    [prefersReducedMotion]
  );

  const handleFeatureLeave = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const tilt = event.currentTarget.querySelector<HTMLElement>('.spec-feature-tilt');
      if (tilt) tilt.style.transform = '';
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => setSplashMinTimePassed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashForced(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  const splashLoaded = splashForced || (heroReady && splashMinTimePassed);

  const handleHeroReady = useCallback(() => setHeroReady(true), []);

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
      {!splashOut && (
        <LoadingScreen isLoaded={splashLoaded} onOutComplete={handleSplashOutComplete} />
      )}

      {splashOut && <Navbar onScrollTo={scrollTo} />}

      <section id="hero" ref={heroRef} className="hero">
        <div className={`hero-canvas ${heroRevealed ? 'is-revealed' : ''}`}>
          <HeroScene
            headOffsetRef={headTracking.offsetRef}
            headActiveRef={headActiveRef}
            mousePosRef={mousePosRef}
            prefersReducedMotion={prefersReducedMotion}
            isScanning={false}
            active={heroInView || !splashOut}
            onReady={handleHeroReady}
          />
        </div>

        <div className="hero-vignette" />
        <div className="hero-bottom-fade" />

        <span className="hero-frame-corner tl" />
        <span className="hero-frame-corner tr" />
        <span className="hero-frame-corner bl" />
        <span className="hero-frame-corner br" />

        <div className="hero-overlay">
          <div className={`hero-meta ${heroRevealed ? 'is-revealed' : ''}`}>
            <div>
              <b>Stark Industries</b>
              Advanced Systems Division
            </div>
            <div className="hero-meta-center">
              <b>Mark L · Arc Reactor</b>
              Head-tracked 3D portrait
            </div>
            <div className="hero-meta-right">
              <b>Malibu Compound</b>
              34.0259° N / 118.7798° W
            </div>
          </div>

          <h1 className={`hero-stage ${heroRevealed ? 'is-revealed' : ''}`}>
            <span className="hero-block hero-block-left">
              <span className="hero-kicker">
                <span className="hero-kicker-index">01</span>
                <span className="hero-kicker-line" />
                Armor
              </span>
              <span className="hero-word">Iron</span>
              <span className="hero-caption">Mark L · Titanium–Gold Alloy</span>
            </span>

            <span className="hero-block hero-block-right">
              <span className="hero-kicker">
                <span className="hero-kicker-index">MK</span>
                <span className="hero-kicker-line" />
                Arc Reactor
              </span>
              <span className="hero-word hero-word-red">Man</span>
              <span className="hero-caption">3 GW · Palladium-free core</span>
            </span>
          </h1>

          <span className="hero-mark" aria-hidden="true">
            Head-tracked parallax
          </span>

          <div className={`hero-footer ${heroRevealed ? 'is-revealed' : ''}`}>
            <span className="hero-footer-spacer" />
            <div className="hero-dock">
              <TrackingControl
                isTracking={isTracking}
                onToggle={toggleHead}
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
              />
              <span className="hero-dock-hint">
                {isTracking
                  ? 'Move your head — the room responds'
                  : 'Or move your cursor to tilt the armor'}
              </span>
            </div>
            <span className="hero-footer-spacer" />
            <div className="scroll-cue">
              <span>Scroll to explore</span>
              <span className="scroll-line" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="stats"
        ref={statsRef}
        className={`specs ${statsInView ? 'is-visible' : ''}`}
      >
        <div className="specs-progress" aria-hidden="true">
          <span>Scroll</span>
          <div className="specs-progress-track">
            <span className="specs-progress-fill" ref={progressFillRef} />
          </div>
          <span>06</span>
        </div>

        <div className="specs-inner">
          <header className="specs-head">
            <div className="reveal">
              <span className="eyebrow">02 — Specifications</span>
              <h2 className="specs-title">
                Engineered
                <br />
                <span className="outline-text">To Endure</span>
              </h2>
            </div>
            <p className="specs-lede reveal">
              Every plate, pulse, and processor is tuned for one purpose: keeping
              the wearer alive long enough to finish the job. A dossier on the
              Mark L platform.
            </p>
          </header>

          <div className="specs-grid">
            <article
              className="spec-feature reveal"
              onPointerMove={handleFeatureMove}
              onPointerLeave={handleFeatureLeave}
            >
              <div className="spec-feature-spotlight" aria-hidden="true" />

              <div className="spec-feature-tilt">
                <div className="spec-feature-head">
                  <span>Core System</span>
                  <span className="spec-feature-index">SPEC / 01</span>
                </div>

                <div className="reactor" aria-hidden="true">
                  <div className="reactor-ticks" />
                  <div className="reactor-ring r1" />
                  <div className="reactor-ring r2" />
                  <div className="reactor-ring r3" />
                  <div className="reactor-core" />
                </div>

                <div className="spec-feature-body">
                  <p className="spec-feature-label">Arc Reactor Output</p>
                  <p className="spec-feature-value">
                    <span className="spec-feature-number" ref={featureValueRef}>
                      3.0
                    </span>
                    <span className="spec-feature-unit">GW</span>
                  </p>
                  <p className="spec-feature-note">
                    A self-sustaining palladium-free core, cradled in a vibranium
                    housing and tuned for zero-downtime output.
                  </p>
                  <div className="spec-bars" aria-hidden="true">
                    {Array.from({ length: 7 }).map((_, index) => (
                      <span key={index} className={index < 6 ? 'is-live' : ''} />
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <div className="spec-list">
              {SPECS.map((spec, index) => (
                <SpecificationRow
                  key={spec.name}
                  index={index + 1}
                  name={spec.name}
                  sub={spec.sub}
                  value={spec.value}
                  unit={spec.unit}
                />
              ))}
            </div>
          </div>

          <div className="specs-quote reveal">
            <span className="quote-mark" aria-hidden="true">
              “
            </span>
            <blockquote>
              <p>The suit and I are one.</p>
              <cite>Tony Stark · Avengers: Infinity War</cite>
            </blockquote>
            <svg
              className="quote-glyph"
              width="46"
              height="46"
              viewBox="0 0 46 46"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="23" cy="23" r="21" stroke="rgba(201,164,92,0.4)" />
              <circle cx="23" cy="23" r="12" stroke="rgba(236,232,223,0.25)" />
              <circle cx="23" cy="23" r="4.5" fill="#cf1f2c" />
            </svg>
          </div>
        </div>
      </section>

      <section
        id="garage"
        ref={garageRef}
        className={`garage ${garageInView ? 'is-visible' : ''}`}
      >
        <div className="garage-canvas">
          {garageHasBeenInView && (
            <ThreeScene
              headOffsetRef={headTracking.offsetRef}
              headActiveRef={headActiveRef}
              prefersReducedMotion={prefersReducedMotion}
              active={garageInView}
            />
          )}
        </div>

        <div className="garage-vignette" />
        <div className="garage-fade-top" />
        <div className="garage-fade-bottom" />

        <div className="garage-overlay">
          <div className="garage-top">
            <div className="garage-heading">
              <span className="garage-index">03 — The Hangar</span>
              <h2 className="garage-title">The Garage</h2>
              <p className="garage-sub">Malibu Compound · Sub-level 02</p>
            </div>

            <div className="garage-status">
              <span className="live-badge">
                <span className="live-dot" aria-hidden="true" />
                {isTracking ? 'Tracking engaged' : 'Live feed'}
              </span>
              <span>Suit bay · 07 vehicles in residence</span>
            </div>
          </div>

          <div className="garage-bottom">
            <div className="garage-dock">
              <div className="garage-dock-label">
                <b>Motion Tracking</b>
                <span>{isTracking ? 'Camera feed active' : 'Webcam standby'}</span>
              </div>
              <TrackingControl
                isTracking={isTracking}
                onToggle={toggleHead}
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
              />
            </div>

            <div className="garage-hint">
              <span>Move your head to look around</span>
              <span className="garage-hint-line" aria-hidden="true" />
            </div>
          </div>
        </div>

        <span className="garage-crosshair left" aria-hidden="true" />
        <span className="garage-crosshair right" aria-hidden="true" />
      </section>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-row">
                <ReactorMark size={40} />
                <div>
                  <span className="footer-brand-name">Stark</span>
                  <span className="footer-brand-sub">Industries</span>
                </div>
              </div>
              <p className="footer-desc">
                An immersive Iron Man experience with real-time webcam head
                tracking, powered by MediaPipe and Three.js. Move your head — the
                room responds.
              </p>
            </div>

            <div>
              <h3 className="footer-col-title">Explore</h3>
              <div className="footer-links">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    className="footer-link"
                    onClick={() => scrollTo(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="footer-col-title">Signal</h3>
              <dl className="footer-meta-list">
                <div>
                  <dt>Location</dt>
                  <dd>Malibu, California</dd>
                </div>
                <div>
                  <dt>Stack</dt>
                  <dd>MediaPipe · Three.js</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Systems online</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="footer-wordmark" aria-hidden="true">
            ST<span>A</span>RK
          </div>

          <div className="footer-bottom">
            <span>© 2026 Stark Industries — Fan concept</span>
            <span>Head-tracked 3D experience</span>
          </div>
        </div>
      </footer>
    </>
  );
}
