/**
 * Typed waypoint and camera route configuration.
 * All positions use Three.js coordinate convention (Y-up, right-handed).
 */

export interface WaypointCorrection {
  /** Optional position offset applied after reading from GLB (Three.js units) */
  positionOffset?: [number, number, number];
  /** Optional quaternion correction [x, y, z, w] multiplied after GLB orientation */
  rotationOffset?: [number, number, number, number];
}

export interface WaypointConfig {
  /** Exact name of the Empty object in the exported GLB scene */
  name: string;
  /** Display label for UI and diagnostics */
  label: string;
  /** If true, this waypoint was explicitly placed in Blender; if false, it is synthesized */
  fromBlender: boolean;
  /** Normalized scroll progress [0..1] at which this waypoint is reached */
  scrollT: number;
  /** Optional corrections applied on top of GLB transforms */
  correction?: WaypointCorrection;
  /** Override position if not reading from GLB (synthesized waypoints) */
  overridePosition?: [number, number, number];
  /** Override quaternion [x, y, z, w] if not reading from GLB */
  overrideRotation?: [number, number, number, number];
}

export type RouteMode = 'waypoint' | 'spline';

export interface RouteConfig {
  /** Ordered list of waypoints defining the camera path */
  waypoints: WaypointConfig[];
  /** Default interpolation mode */
  mode: RouteMode;
  /** If true, show diagnostic overlay in development */
  diagnosticEnabled: boolean;
  /** Field of view in degrees */
  fov: number;
  /** Near clip plane */
  near: number;
  /** Far clip plane */
  far: number;
}

export interface HeadTrackingConfig {
  /** Maximum head displacement mapped to camera offset (Three.js units) */
  maxOffsetX: number;
  maxOffsetY: number;
  maxOffsetZ: number;
  /** Dead zone: ignore head movements smaller than this fraction of range */
  deadZone: number;
  /** Temporal smoothing factor (0=no smoothing, 1=frozen) */
  smoothing: number;
  /** Face landmark sensitivity multiplier */
  sensitivity: number;
  /** Processing frequency limit (ms between frames) */
  processIntervalMs: number;
  /** Invert head tracking movement direction */
  invertMovement?: boolean;
  /** Invert vertical (up/down) tracking independently */
  invertY?: boolean;
}

export interface ResolvedWaypoint {
  /** Name matched from config */
  name: string;
  label: string;
  fromBlender: boolean;
  scrollT: number;
  /** World position after applying parent transforms and corrections */
  worldPosition: [number, number, number];
  /** World quaternion [x, y, z, w] */
  worldQuaternion: [number, number, number, number];
  /** Whether the GLB node was actually found */
  found: boolean;
  /** Error message if not found */
  error?: string;
}
