/**
 * ThreeScene — the persistent R3F canvas.
 *
 * Responsibilities:
 * - Load and render the Blender GLB model
 * - Resolve waypoints from the GLB scene graph
 * - Drive camera from scroll progress + head-tracking offset
 * - Implement off-axis projection approximation
 * - Render diagnostic overlay in development
 * - Handle loading states and errors
 */

'use client';

import { Suspense, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';

import {
  ROUTE_CONFIG,
  HEAD_TRACKING_CONFIG,
  MODEL_URL,
  FOCAL_TARGET,
  FOCAL_DISTANCE,
} from '@/lib/routeConfig';
import { resolveWaypoints, computeCameraPoseFromScroll } from '@/lib/waypointResolver';
import type { ResolvedWaypoint } from '@/types/waypoint';
import type { HeadOffset } from '@/hooks/useHeadTracking';

// ─── Reusable temporaries (no GC in render loop) ─────────────────────────────
const _basePos = new THREE.Vector3();
const _baseQuat = new THREE.Quaternion();
const _headOffset = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _finalQuat = new THREE.Quaternion();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _dampedOffset = new THREE.Vector3();
const _currentShift = new THREE.Vector2();
const _focalPoint = new THREE.Vector3(...FOCAL_TARGET);
const _tempMatrix = new THREE.Matrix4();
const _baseLookAtQuat = new THREE.Quaternion();
const _worldUp = new THREE.Vector3(0, 1, 0);

// ─── Model component ─────────────────────────────────────────────────────────

interface ModelProps {
  onReady: (scene: THREE.Group) => void;
  onError: (err: string) => void;
}

function Model({ onReady, onError }: ModelProps) {
  const { scene } = useGLTF(MODEL_URL) as { scene: THREE.Group };
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (scene && !notifiedRef.current) {
      notifiedRef.current = true;
      // Enable shadow receiving on all meshes
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          // Fix color space for PBR materials
          if (obj.material instanceof THREE.MeshStandardMaterial) {
            if (obj.material.map) {
              obj.material.map.colorSpace = THREE.SRGBColorSpace;
            }
          }
        }
      });
      onReady(scene);
    }
  }, [scene, onReady, onError]);

  return <primitive object={scene} />;
}

// ─── Diagnostic helpers ──────────────────────────────────────────────────────



// ─── Camera controller ───────────────────────────────────────────────────────

interface CameraControllerProps {
  progressRef?: React.RefObject<number>;
  headOffsetRef: React.RefObject<HeadOffset>;
  headActiveRef: React.RefObject<boolean>;
  waypointsRef: React.RefObject<ResolvedWaypoint[]>;
  prefersReducedMotion: boolean;
}

// Default base pose from Blender Empty [1.332, 1.965, 2.808] with Blender-to-Camera correction
const _defaultEmptyPos = new THREE.Vector3(1.33212, 1.96539, 2.80796);
const _defaultEmptyQuat = new THREE.Quaternion(
  -0.12756317,
  0.42007583,
  0.05978273,
  0.89648758
);

function CameraController({
  headOffsetRef,
  headActiveRef,
  waypointsRef,
  prefersReducedMotion,
}: CameraControllerProps) {
  const { camera, size } = useThree();

  useFrame((_, delta) => {
    // Clamp delta to prevent huge leaps if frame dropped or tab inactive
    const dt = Math.min(delta, 0.1);

    const waypoints = waypointsRef.current;
    if (waypoints && waypoints.length > 0) {
      const wp = waypoints[0];
      _basePos.set(wp.worldPosition[0], wp.worldPosition[1], wp.worldPosition[2]);
      _baseQuat.set(
        wp.worldQuaternion[0],
        wp.worldQuaternion[1],
        wp.worldQuaternion[2],
        wp.worldQuaternion[3]
      );
    } else {
      _basePos.copy(_defaultEmptyPos);
      _baseQuat.copy(_defaultEmptyQuat);
    }

    // Target head tracking offset
    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;

    if (headActiveRef.current && !prefersReducedMotion) {
      const ho = headOffsetRef.current;
      if (ho) {
        targetX = ho.x;
        targetY = ho.y;
        targetZ = ho.z;
      }
    }

    // Frame-rate independent spring-damp: smooths out 30Hz webcam steps and kills all jitter
    _dampedOffset.x = THREE.MathUtils.damp(_dampedOffset.x, targetX, 10, dt);
    _dampedOffset.y = THREE.MathUtils.damp(_dampedOffset.y, targetY, 10, dt);
    _dampedOffset.z = THREE.MathUtils.damp(_dampedOffset.z, targetZ, 10, dt);

    // Compute camera base orientation pointing directly at the central focal point
    _baseLookAtQuat.setFromRotationMatrix(
      _tempMatrix.lookAt(_basePos, _focalPoint, _worldUp)
    );

    // Camera local axes directly from the Blender Empty's true orientation
    _right.set(1, 0, 0).applyQuaternion(_baseQuat);
    _up.set(0, 1, 0).applyQuaternion(_baseQuat);
    _forward.set(0, 0, -1).applyQuaternion(_baseQuat);

    // Anchor the focal target along the Empty's exact optical axis for 100% Blender alignment
    _focalPoint.copy(_basePos).addScaledVector(_forward, FOCAL_DISTANCE);

    const hc = HEAD_TRACKING_CONFIG;
    _headOffset.set(0, 0, 0);
    _headOffset.addScaledVector(_right, _dampedOffset.x * hc.maxOffsetX);
    _headOffset.addScaledVector(_up, _dampedOffset.y * hc.maxOffsetY);
    _headOffset.addScaledVector(_forward, _dampedOffset.z * hc.maxOffsetZ);

    // Position the camera shifted around the focal baseline
    _finalPos.copy(_basePos).add(_headOffset);
    camera.position.copy(_finalPos);

    // Parallax Depth Anchor: Always focus directly on the center of what is being seen
    // Objects at _focalPoint stay anchored, while foreground and background shift in opposite directions
    camera.lookAt(_focalPoint);

    // Clear view offset so the physical perspective convergence creates the depth
    if (camera instanceof THREE.PerspectiveCamera && camera.view) {
      camera.clearViewOffset();
    }

    camera.updateMatrixWorld();
  });

  return null;
}

// ─── Diagnostic panel ────────────────────────────────────────────────────────

interface DiagnosticOverlayProps {
  waypoints: ResolvedWaypoint[];
  progressRef: React.RefObject<number>;
  headOffsetRef: React.RefObject<HeadOffset>;
  onJumpTo: (index: number) => void;
}

function DiagnosticOverlay({
  waypoints,
  progressRef,
  headOffsetRef,
  onJumpTo,
}: DiagnosticOverlayProps) {
  const { camera } = useThree();

  return (
    <Html
      style={{ position: 'fixed', top: 8, right: 8, pointerEvents: 'none' }}
      fullscreen
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.75)',
          color: '#00ff88',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '8px 10px',
          borderRadius: 6,
          width: 260,
          maxHeight: '70vh',
          overflowY: 'auto',
          pointerEvents: 'all',
          border: '1px solid rgba(0,255,136,0.3)',
        }}
      >
        <div style={{ marginBottom: 4, fontWeight: 'bold', color: '#88ffcc' }}>
          🔧 WAYPOINT DIAGNOSTIC
        </div>
        <div style={{ color: '#aaa' }}>
          Scroll: {((progressRef.current ?? 0) * 100).toFixed(1)}%
        </div>
        <div style={{ color: '#aaa' }}>
          Cam:{' '}
          {[camera.position.x, camera.position.y, camera.position.z]
            .map((v) => v.toFixed(3))
            .join(', ')}
        </div>
        <div style={{ color: '#aaa', marginBottom: 6 }}>
          Head:{' '}
          {headOffsetRef.current
            ? [
                headOffsetRef.current.x,
                headOffsetRef.current.y,
                headOffsetRef.current.z,
              ]
                .map((v) => v.toFixed(2))
                .join(', ')
            : '0, 0, 0'}
        </div>
        <div style={{ marginBottom: 4, color: '#88ffcc' }}>Waypoints:</div>
        {waypoints.map((wp, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <div style={{ color: wp.fromBlender ? '#00ff88' : '#88aaff' }}>
              [{i}] {wp.label} {wp.fromBlender ? '✦' : '◆'}
              {!wp.found && (
                <span style={{ color: '#ff6666' }}> ✗</span>
              )}
            </div>
            <div style={{ color: '#777', fontSize: 9 }}>
              pos: [{wp.worldPosition.map((v) => v.toFixed(2)).join(', ')}]
            </div>
            <div style={{ color: '#777', fontSize: 9 }}>
              rot: [{wp.worldQuaternion.map((v) => v.toFixed(2)).join(', ')}]
            </div>
            {wp.error && (
              <div style={{ color: '#ff8888', fontSize: 9 }}>{wp.error}</div>
            )}
            <button
              onClick={() => onJumpTo(i)}
              style={{
                marginTop: 2,
                padding: '1px 6px',
                background: '#00ff8822',
                color: '#00ff88',
                border: '1px solid #00ff8844',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 9,
                pointerEvents: 'all',
              }}
            >
              Jump
            </button>
          </div>
        ))}
      </div>
    </Html>
  );
}

// ─── Scene graph ─────────────────────────────────────────────────────────────

interface SceneGraphProps {
  progressRef: React.RefObject<number>;
  headOffsetRef: React.RefObject<HeadOffset>;
  headActiveRef: React.RefObject<boolean>;
  waypointsRef: React.RefObject<ResolvedWaypoint[]>;
  onWaypointsResolved: (wp: ResolvedWaypoint[]) => void;
  onLoadError: (err: string) => void;
  resolvedWaypoints: ResolvedWaypoint[];
  prefersReducedMotion: boolean;
  showDiagnostic: boolean;
  onJumpTo: (index: number) => void;
}

function SceneGraph({
  progressRef,
  headOffsetRef,
  headActiveRef,
  waypointsRef,
  onWaypointsResolved,
  onLoadError,
  resolvedWaypoints,
  prefersReducedMotion,
  showDiagnostic,
  onJumpTo,
}: SceneGraphProps) {
  const activeWaypointIndex = useMemo(() => {
    const t = progressRef.current ?? 0;
    let best = 0;
    resolvedWaypoints.forEach((wp, i) => {
      if (wp.scrollT <= t) best = i;
    });
    return best;
  }, [progressRef, resolvedWaypoints]);

  const handleModelReady = useCallback(
    (scene: THREE.Group) => {
      const resolved = resolveWaypoints(scene, ROUTE_CONFIG.waypoints);
      waypointsRef.current = resolved;
      onWaypointsResolved(resolved);
    },
    [waypointsRef, onWaypointsResolved]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, -3]} intensity={0.4} />

      {/* Environment model */}
      <Suspense fallback={null}>
        <Model onReady={handleModelReady} onError={onLoadError} />
      </Suspense>

      {/* Camera driver */}
      <CameraController
        progressRef={progressRef}
        headOffsetRef={headOffsetRef}
        headActiveRef={headActiveRef}
        waypointsRef={waypointsRef}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Diagnostic panel */}
      {showDiagnostic && resolvedWaypoints.length > 0 && (
        <DiagnosticOverlay
          waypoints={resolvedWaypoints}
          progressRef={progressRef}
          headOffsetRef={headOffsetRef}
          onJumpTo={onJumpTo}
        />
      )}
    </>
  );
}

// ─── Public exports ──────────────────────────────────────────────────────────

export interface ThreeSceneProps {
  progressRef: React.RefObject<number>;
  headOffsetRef: React.RefObject<HeadOffset>;
  headActiveRef: React.RefObject<boolean>;
  onWaypointsResolved: (wp: ResolvedWaypoint[]) => void;
  resolvedWaypoints: ResolvedWaypoint[];
  prefersReducedMotion: boolean;
  jumpToWaypointRef: React.RefObject<((index: number) => void) | null>;
}

export function ThreeScene({
  progressRef,
  headOffsetRef,
  headActiveRef,
  onWaypointsResolved,
  resolvedWaypoints,
  prefersReducedMotion,
  jumpToWaypointRef,
}: ThreeSceneProps) {
  const waypointsRef = useRef<ResolvedWaypoint[]>([]);
  const resolvedRef = useRef(resolvedWaypoints);
  resolvedRef.current = resolvedWaypoints;

  const handleLoadError = useCallback((err: string) => {
    console.error('[ThreeScene] Model load error:', err);
  }, []);

  const handleJumpTo = useCallback(
    (index: number) => {
      const wps = waypointsRef.current;
      if (index >= 0 && index < wps.length) {
        progressRef.current = wps[index].scrollT;
        // Scroll window to match
        const el = document.getElementById('scroll-container');
        if (el) {
          const maxScroll = el.scrollHeight - el.clientHeight;
          el.scrollTop = wps[index].scrollT * maxScroll;
        }
      }
    },
    [progressRef]
  );

  // Expose jump function to parent
  useEffect(() => {
    jumpToWaypointRef.current = handleJumpTo;
  }, [jumpToWaypointRef, handleJumpTo]);

  const showDiagnostic =
    ROUTE_CONFIG.diagnosticEnabled && process.env.NODE_ENV === 'development';

  return (
    <Canvas
      camera={{
        fov: ROUTE_CONFIG.fov,
        near: ROUTE_CONFIG.near,
        far: ROUTE_CONFIG.far,
        position: [1.332, 1.965, 2.808],
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}
      style={{ position: 'absolute', inset: 0 }}
    >
      <SceneGraph
        progressRef={progressRef}
        headOffsetRef={headOffsetRef}
        headActiveRef={headActiveRef}
        waypointsRef={waypointsRef}
        onWaypointsResolved={onWaypointsResolved}
        onLoadError={handleLoadError}
        resolvedWaypoints={resolvedWaypoints}
        prefersReducedMotion={prefersReducedMotion}
        showDiagnostic={showDiagnostic}
        onJumpTo={handleJumpTo}
      />
    </Canvas>
  );
}

// Preload GLB
useGLTF.preload(MODEL_URL);
