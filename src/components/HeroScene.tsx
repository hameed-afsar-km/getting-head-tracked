/**
 * HeroScene — hero2.glb with perfected Iron Man upper-body framing,
 * ample clearance above the helmet, interactive mouse tilt & head tracking,
 * idle breathing motion, and dynamic pulsing Arc Reactor core.
 */

'use client';

import { Suspense, memo, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { HERO_MODEL_URL, HEAD_TRACKING_CONFIG } from '@/lib/routeConfig';
import type { HeadOffset } from '@/hooks/useHeadTracking';

// ─── Reusable vectors & quaternions (Zero GC) ────────────────────────────────
const _basePos = new THREE.Vector3();
const _focalPoint = new THREE.Vector3();
const _headOffset = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _dampedOffset = new THREE.Vector3();
const _dampedMouse = new THREE.Vector2();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _noop = () => {};

// Camera positioned with generous space above helmet
// Iron Man model center: [7.878, 1.80, -0.868]
// Camera moved up & back: X=10.45, Y=2.10, Z=-0.872
// Looking at collarbone/neck region: Y=1.78
// This places the top of the helmet comfortably in upper-middle of screen with ample headspace
const HERO_CAM_POS = new THREE.Vector3(10.48, 2.12, -0.872);
const HERO_FOCAL = new THREE.Vector3(7.878, 1.76, -0.868);

function setSceneEnvironment(
  scene: THREE.Scene,
  texture: THREE.Texture | null
) {
  scene.environment = texture;
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    setSceneEnvironment(scene, envTex);

    return () => {
      setSceneEnvironment(scene, null);
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

function HeroModel({
  onReady,
}: {
  onReady: (g: THREE.Group) => void;
}) {
  const { scene } = useGLTF(HERO_MODEL_URL) as { scene: THREE.Group };
  const groupRef = useRef<THREE.Group>(null);
  const notified = useRef(false);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    if (scene && !notified.current) {
      notified.current = true;
      const mats: THREE.MeshStandardMaterial[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
          if (obj.material instanceof THREE.MeshStandardMaterial) {
            if (obj.material.map) obj.material.map.colorSpace = THREE.SRGBColorSpace;
            if (obj.material.emissiveMap) obj.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            obj.material.envMapIntensity = 1.75;
            obj.material.needsUpdate = true;
            mats.push(obj.material);
          }
        }
      });
      materialsRef.current = mats;
      onReady(scene);
    }
  }, [scene, onReady]);

  // Subtle breathing animation on suit group
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      // Very gentle organic breathing expansion
      const breath = Math.sin(t * 1.8) * 0.003;
      groupRef.current.position.y = breath;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// ─── Pulsing Arc Reactor Light ───────────────────────────────────────────────

function ArcReactorLight({ isScanning }: { isScanning?: boolean }) {
  const redCoreRef = useRef<THREE.PointLight>(null);
  const blueCoreRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = Math.sin(t * 3.2) * 0.45 + Math.sin(t * 6.8) * 0.2;

    if (redCoreRef.current) {
      redCoreRef.current.intensity = isScanning ? 6.5 : 2.6 + pulse;
    }
    if (blueCoreRef.current) {
      blueCoreRef.current.intensity = isScanning ? 4.0 : 1.2 + pulse * 0.5;
    }
  });

  return (
    <>
      {/* Primary red warm arc reactor glow */}
      <pointLight
        ref={redCoreRef}
        position={[8.35, 1.58, -0.72]}
        intensity={2.8}
        color="#ff2222"
        distance={5}
        decay={2}
      />
      {/* High-energy white-cyan core spark */}
      <pointLight
        ref={blueCoreRef}
        position={[8.42, 1.58, -0.84]}
        intensity={1.4}
        color="#cceeff"
        distance={3.5}
        decay={2}
      />
    </>
  );
}

// ─── Camera Controller ───────────────────────────────────────────────────────

interface CameraControllerProps {
  headOffsetRef: React.RefObject<HeadOffset>;
  headActiveRef: React.RefObject<boolean>;
  mousePosRef: React.RefObject<{ x: number; y: number }>;
  prefersReducedMotion: boolean;
}

function HeroCameraController({
  headOffsetRef,
  headActiveRef,
  mousePosRef,
  prefersReducedMotion,
}: CameraControllerProps) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.copy(HERO_CAM_POS);
    camera.lookAt(HERO_FOCAL);
    camera.updateMatrixWorld();
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = clock.getElapsedTime();

    _basePos.copy(HERO_CAM_POS);
    _focalPoint.copy(HERO_FOCAL);

    // Subtle idle breathing float on the camera
    if (!prefersReducedMotion) {
      const breathX = Math.sin(t * 1.1) * 0.015;
      const breathY = Math.cos(t * 1.5) * 0.018;
      _basePos.y += breathY;
      _basePos.z += breathX;
    }

    // Directional vectors
    _forward.subVectors(_focalPoint, _basePos).normalize();
    _up.set(0, 1, 0);
    _right.crossVectors(_forward, _up).normalize();
    _up.crossVectors(_right, _forward).normalize();

    let tx = 0, ty = 0, tz = 0;

    if (headActiveRef.current && !prefersReducedMotion) {
      // Head-tracking parallax
      const ho = headOffsetRef.current;
      if (ho) {
        tx = ho.x;
        ty = ho.y;
        tz = ho.z;
      }
    } else if (!prefersReducedMotion && mousePosRef.current) {
      // Interactive mouse parallax (alive even before enabling webcam!)
      const mx = mousePosRef.current.x;
      const my = mousePosRef.current.y;
      _dampedMouse.x = THREE.MathUtils.damp(_dampedMouse.x, mx, 8, dt);
      _dampedMouse.y = THREE.MathUtils.damp(_dampedMouse.y, my, 8, dt);

      tx = _dampedMouse.x * 0.55;
      ty = -_dampedMouse.y * 0.45;
    }

    _dampedOffset.x = THREE.MathUtils.damp(_dampedOffset.x, tx, 9, dt);
    _dampedOffset.y = THREE.MathUtils.damp(_dampedOffset.y, ty, 9, dt);
    _dampedOffset.z = THREE.MathUtils.damp(_dampedOffset.z, tz, 9, dt);

    const hc = HEAD_TRACKING_CONFIG;
    _headOffset.set(0, 0, 0);
    _headOffset.addScaledVector(_right, _dampedOffset.x * hc.maxOffsetX);
    _headOffset.addScaledVector(_up, _dampedOffset.y * hc.maxOffsetY);
    _headOffset.addScaledVector(_forward, _dampedOffset.z * hc.maxOffsetZ);

    _finalPos.copy(_basePos).add(_headOffset);
    camera.position.copy(_finalPos);
    camera.lookAt(_focalPoint);

    if (camera instanceof THREE.PerspectiveCamera && camera.view) {
      camera.clearViewOffset();
    }
    camera.updateMatrixWorld();
  });

  return null;
}

// ─── Public Component ────────────────────────────────────────────────────────

export interface HeroSceneProps {
  headOffsetRef: React.RefObject<HeadOffset>;
  headActiveRef: React.RefObject<boolean>;
  mousePosRef: React.RefObject<{ x: number; y: number }>;
  prefersReducedMotion: boolean;
  isScanning?: boolean;
  /** When false the render loop is paused (e.g. section scrolled offscreen). */
  active?: boolean;
  /** Called once the GLB is loaded and ready to render. */
  onReady?: () => void;
}

export const HeroScene = memo(function HeroScene({
  headOffsetRef,
  headActiveRef,
  mousePosRef,
  prefersReducedMotion,
  isScanning = false,
  active = true,
  onReady,
}: HeroSceneProps) {
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      camera={{
        fov: 42,
        near: 0.01,
        far: 500,
        position: [10.48, 2.12, -0.872],
      }}
      gl={{
        antialias: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.35,
        outputColorSpace: THREE.SRGBColorSpace,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 1.25]}
      shadows={false}
      style={{ position: 'absolute', inset: 0 }}
    >
      <StudioEnvironment />

      {/* Balanced overhead ambient */}
      <ambientLight intensity={0.48} color="#e2e8f0" />

      {/* Main key light highlighting the crimson and gold armor */}
      <directionalLight position={[11.0, 4.5, 1.2]} intensity={3.2} color="#fffaf0" />

      {/* High-tech rim light defining the helmet silhouette and shoulders */}
      <directionalLight position={[5.2, 3.0, -3.8]} intensity={2.0} color="#93c5fd" />

      {/* Warm fill light on right shoulder */}
      <directionalLight position={[7.0, 1.8, 3.2]} intensity={1.2} color="#fef3c7" />

      {/* Pulsing Arc Reactor core */}
      <ArcReactorLight isScanning={isScanning} />

      {/* Gold shoulder highlight */}
      <pointLight position={[7.4, 2.3, -1.6]} intensity={1.8} color="#c8a84b" distance={4} decay={2} />

      <Suspense fallback={null}>
        <HeroModel onReady={onReady ?? _noop} />
      </Suspense>

      <HeroCameraController
        headOffsetRef={headOffsetRef}
        headActiveRef={headActiveRef}
        mousePosRef={mousePosRef}
        prefersReducedMotion={prefersReducedMotion}
      />
    </Canvas>
  );
});

useGLTF.preload(HERO_MODEL_URL);
