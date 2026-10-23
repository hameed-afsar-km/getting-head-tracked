/**
 * Waypoint resolver: reads world transforms from a loaded GLTF scene
 * and resolves WaypointConfig[] → ResolvedWaypoint[].
 */

import * as THREE from 'three';
import type { WaypointConfig, ResolvedWaypoint } from '@/types/waypoint';

const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldScale = new THREE.Vector3();

/**
 * Given a THREE.Group (gltf.scene), resolve all configured waypoints.
 * Reads world matrices, applies optional corrections, and falls back
 * to override values for synthesized waypoints.
 */
export function resolveWaypoints(
  gltfScene: THREE.Group,
  configs: WaypointConfig[]
): ResolvedWaypoint[] {
  // Force world matrix update for entire scene graph
  gltfScene.updateWorldMatrix(true, true);

  return configs.map((cfg) => {
    // If the waypoint has explicit override values, use them directly
    if (cfg.overridePosition && cfg.overrideRotation) {
      return {
        name: cfg.name,
        label: cfg.label,
        fromBlender: cfg.fromBlender,
        scrollT: cfg.scrollT,
        worldPosition: cfg.overridePosition,
        worldQuaternion: cfg.overrideRotation,
        found: false,
        error: 'Synthesized waypoint — no GLB node',
      } satisfies ResolvedWaypoint;
    }

    // Try to find the named node in the scene
    let node: THREE.Object3D | null = null;
    gltfScene.traverse((obj) => {
      if (obj.name === cfg.name && !node) {
        node = obj;
      }
    });

    if (!node) {
      const error = `GLB node "${cfg.name}" not found in scene`;
      console.warn('[WaypointResolver]', error);

      // Use override if partial overrides exist
      if (cfg.overridePosition || cfg.overrideRotation) {
        return {
          name: cfg.name,
          label: cfg.label,
          fromBlender: cfg.fromBlender,
          scrollT: cfg.scrollT,
          worldPosition: cfg.overridePosition ?? [0, 0, 0],
          worldQuaternion: cfg.overrideRotation ?? [0, 0, 0, 1],
          found: false,
          error,
        } satisfies ResolvedWaypoint;
      }

      return {
        name: cfg.name,
        label: cfg.label,
        fromBlender: cfg.fromBlender,
        scrollT: cfg.scrollT,
        worldPosition: [0, 0, 0],
        worldQuaternion: [0, 0, 0, 1],
        found: false,
        error,
      } satisfies ResolvedWaypoint;
    }

    // Read world transform
    (node as THREE.Object3D).matrixWorld.decompose(_worldPos, _worldQuat, _worldScale);

    // Apply optional correction
    if (cfg.correction?.positionOffset) {
      const [dx, dy, dz] = cfg.correction.positionOffset;
      _worldPos.x += dx;
      _worldPos.y += dy;
      _worldPos.z += dz;
    }

    if (cfg.correction?.rotationOffset) {
      const [cx, cy, cz, cw] = cfg.correction.rotationOffset;
      const corrQuat = new THREE.Quaternion(cx, cy, cz, cw);
      _worldQuat.multiply(corrQuat);
    }

    const result: ResolvedWaypoint = {
      name: cfg.name,
      label: cfg.label,
      fromBlender: cfg.fromBlender,
      scrollT: cfg.scrollT,
      worldPosition: [_worldPos.x, _worldPos.y, _worldPos.z],
      worldQuaternion: [_worldQuat.x, _worldQuat.y, _worldQuat.z, _worldQuat.w],
      found: true,
    };

    console.log(
      `[WaypointResolver] "${cfg.name}" → pos=[${result.worldPosition.map((v) => v.toFixed(3)).join(', ')}]` +
        ` rot=[${result.worldQuaternion.map((v) => v.toFixed(3)).join(', ')}]`
    );

    return result;
  });
}

/**
 * Interpolate between two resolved waypoints at progress t ∈ [0, 1].
 * Writes result into outPos and outQuat.
 */
export function interpolateWaypoints(
  a: ResolvedWaypoint,
  b: ResolvedWaypoint,
  t: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
): void {
  const qa = new THREE.Quaternion(...a.worldQuaternion);
  const qb = new THREE.Quaternion(...b.worldQuaternion);

  outPos.set(
    a.worldPosition[0] + (b.worldPosition[0] - a.worldPosition[0]) * t,
    a.worldPosition[1] + (b.worldPosition[1] - a.worldPosition[1]) * t,
    a.worldPosition[2] + (b.worldPosition[2] - a.worldPosition[2]) * t
  );

  outQuat.slerpQuaternions(qa, qb, t);
}

/**
 * Given normalized scroll progress [0..1] and resolved waypoints,
 * compute the current base camera position and orientation.
 */
export function computeCameraPoseFromScroll(
  scrollT: number,
  waypoints: ResolvedWaypoint[],
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion
): void {
  if (waypoints.length === 0) {
    outPos.set(0, 0, 5);
    outQuat.identity();
    return;
  }

  if (waypoints.length === 1) {
    outPos.set(...waypoints[0].worldPosition);
    outQuat.set(...waypoints[0].worldQuaternion);
    return;
  }

  const clamped = Math.max(0, Math.min(1, scrollT));

  // Find the segment
  for (let i = 0; i < waypoints.length - 1; i++) {
    const tA = waypoints[i].scrollT;
    const tB = waypoints[i + 1].scrollT;

    if (clamped >= tA && clamped <= tB) {
      const segT = tB > tA ? (clamped - tA) / (tB - tA) : 0;
      interpolateWaypoints(waypoints[i], waypoints[i + 1], segT, outPos, outQuat);
      return;
    }
  }

  // Clamp to last waypoint
  const last = waypoints[waypoints.length - 1];
  outPos.set(...last.worldPosition);
  outQuat.set(...last.worldQuaternion);
}
