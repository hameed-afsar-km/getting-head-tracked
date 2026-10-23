/**
 * ScrollContent — the scrollable HTML sections layered over the 3D canvas.
 * Each section corresponds to a configured waypoint.
 */

'use client';

import { ROUTE_CONFIG } from '@/lib/routeConfig';
import type { ResolvedWaypoint } from '@/types/waypoint';

const SECTION_CONTENT = [
  {
    eyebrow: 'Welcome',
    heading: 'Step Inside',
    body: 'An immersive 3D environment built from your Blender scene. Scroll to explore the space, or enable head tracking to look around naturally.',
  },
  {
    eyebrow: 'Explore',
    heading: 'Scene Overview',
    body: 'The environment unfolds as you scroll. Each section of the page guides the camera through a carefully composed viewpoint inside the virtual space.',
  },
  {
    eyebrow: 'Detail',
    heading: 'Wide Perspective',
    body: 'Pull back and take in the full breadth of the environment. Materials and textures are loaded directly from the exported GLB — no approximations.',
  },
  {
    eyebrow: 'Immersion',
    heading: 'Window Effect',
    body: 'With head tracking enabled, your monitor becomes a window into this world. Move your head and the perspective shifts as if you are looking through glass.',
  },
];

interface ScrollContentProps {
  resolvedWaypoints: ResolvedWaypoint[];
}

export function ScrollContent({ resolvedWaypoints }: ScrollContentProps) {
  const waypoints = ROUTE_CONFIG.waypoints;
  const count = waypoints.length;

  return (
    <>
      {waypoints.map((wp, i) => {
        const content = SECTION_CONTENT[i] ?? {
          eyebrow: `Section ${i + 1}`,
          heading: wp.label,
          body: '',
        };
        const resolved = resolvedWaypoints[i];
        const isFirst = i === 0;
        const isLast = i === count - 1;

        return (
          <section
            key={i}
            id={`section-${i}`}
            aria-label={wp.label}
            style={{
              height: '100vh',
              display: 'flex',
              alignItems: isFirst ? 'flex-end' : isLast ? 'flex-end' : 'center',
              justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start',
              padding: '0 5vw 8vh',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                maxWidth: 380,
                background: 'rgba(2, 4, 8, 0.55)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: '28px 32px',
                pointerEvents: 'all',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#63b3ed',
                  marginBottom: 8,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {content.eyebrow}
                {resolved?.fromBlender && (
                  <span
                    title="Camera position from Blender Empty"
                    style={{ marginLeft: 6, color: '#48bb78' }}
                  >
                    ✦ Blender
                  </span>
                )}
              </div>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#f7fafc',
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {content.heading}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                }}
              >
                {content.body}
              </p>

              {/* Section progress indicator */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  marginTop: 20,
                }}
              >
                {waypoints.map((_, j) => (
                  <div
                    key={j}
                    style={{
                      height: 2,
                      flex: j === i ? 3 : 1,
                      background:
                        j === i
                          ? '#63b3ed'
                          : j < i
                          ? 'rgba(99, 179, 237, 0.4)'
                          : 'rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
