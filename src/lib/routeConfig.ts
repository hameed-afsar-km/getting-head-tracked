/**
 * Centralized route and head-tracking configuration.
 *
 * WAYPOINT NOTES (from GLB inspection):
 * ─────────────────────────────────────
 * The exported 3d.glb contains ONE deliberate camera Empty:
 *   Node [0] "Empty" — pos=[1.332, 1.965, 2.808], rot=[0.544, 0.339, -0.255, 0.724]
 *
 * All other [EMPTY] nodes in the GLB are mesh-group containers sharing the
 * standard Blender→glTF correction quaternion [-0.7071, 0, 0, 0.7071].
 * They are NOT camera viewpoints.
 *
 * Waypoints 2+ below are synthesized, exploring the scene geometry.
 * Edit `overridePosition` and `overrideRotation` to tune each viewpoint.
 * Once you add more Empty objects to Untitled.blend and re-export, set
 * fromBlender: true and remove overridePosition/overrideRotation.
 */

import type { RouteConfig, HeadTrackingConfig } from '@/types/waypoint';

export const ROUTE_CONFIG: RouteConfig = {
  mode: 'waypoint',
  diagnosticEnabled: false,
  fov: 60,
  near: 0.01,
  far: 2000,

  waypoints: [
    {
      // ── Blender Empty: camera marker from 3d.glb ──
      name: 'Empty',
      label: 'Blender Camera View',
      fromBlender: true,
      scrollT: 0,
      // Blender Empty objects exported to glTF need a -90° X rotation
      // to transform from Blender object coordinates (+Z up, +Y forward)
      // into Three.js / glTF camera coordinates (-Z forward, +Y up).
      correction: {
        rotationOffset: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2],
      },
    },
  ],
};

/** Focal distance (in meters) along the Blender Empty forward vector */
export const FOCAL_DISTANCE = 2.5;

/** Default focal point centered on the garage interior / character */
export const FOCAL_TARGET: [number, number, number] = [-0.513, 1.268, 1.272];

export const HEAD_TRACKING_CONFIG: HeadTrackingConfig = {
  maxOffsetX: 0.16,   // 16cm physical scale (calibrated to real monitor dimensions)
  maxOffsetY: 0.10,   // 10cm vertical scale
  maxOffsetZ: 0.08,   // 8cm depth push-pull
  deadZone: 0.015,    // subtle deadzone, feels immediate and responsive
  smoothing: 0.88,    // smooth temporal filtering without lag
  sensitivity: 0.85,  // natural 1:1 physical window feel
  processIntervalMs: 20, // 50fps processing rate
  invertMovement: true,  // inverted horizontal movement
  invertY: true,         // inverted vertical movement as requested
};

/** Public URL for the GLB model served from Next.js public directory */
export const MODEL_URL = '/models/3d.glb';

/** Section count derived from waypoints */
export const SECTION_COUNT = ROUTE_CONFIG.waypoints.length;
