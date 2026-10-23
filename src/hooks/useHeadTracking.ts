/**
 * useHeadTracking — MediaPipe Face Landmarker hook.
 *
 * Responsibilities:
 * - Load MediaPipe wasm/model on demand (explicit user activation)
 * - Stream webcam frames and extract face landmarks
 * - Compute normalized head offset relative to calibrated neutral
 * - Expose smoothed offset values via ref (no per-frame React state)
 * - Handle all error states: no camera, permission denied, MP init failure
 * - Clean up on disable and unmount
 */

'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { HeadTrackingConfig } from '@/types/waypoint';
import { installTfliteLogFilter } from '@/lib/tfliteLogFilter';

// The TFLite WASM runtime logs informational lines to stderr, which the
// MediaPipe glue forwards to console.error. Install the filter up-front so
// the dev overlay does not report them as errors.
installTfliteLogFilter();

export type TrackingStatus =
  | 'idle'
  | 'requesting'
  | 'initializing'
  | 'active'
  | 'no-face'
  | 'error'
  | 'disabled';

export interface HeadOffset {
  x: number; // [-1..1] normalized lateral offset
  y: number; // [-1..1] normalized vertical offset
  z: number; // [-1..1] normalized depth offset (approx from face size)
}

export interface HeadTrackingState {
  status: TrackingStatus;
  errorMessage: string | null;
  isActive: boolean;
}

export interface HeadTrackingApi {
  state: HeadTrackingState;
  /** Ref to latest smoothed head offset — read in animation loop, no re-render */
  offsetRef: React.RefObject<HeadOffset>;
  enable: () => Promise<void>;
  disable: () => void;
  recenter: () => void;
}

const NOSE_TIP_INDEX = 1;
const LEFT_EYE_INDEX = 33;
const RIGHT_EYE_INDEX = 263;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function smoothDeadzone(val: number, threshold: number): number {
  const abs = Math.abs(val);
  if (abs <= threshold) return 0;
  // Smooth cubic Hermite interpolation above threshold to avoid step discontinuities
  const t = Math.min(1, (abs - threshold) / (1 - threshold));
  return Math.sign(val) * (t * t * (3 - 2 * t));
}

export function useHeadTracking(config: HeadTrackingConfig): HeadTrackingApi {
  const [state, setState] = useState<HeadTrackingState>({
    status: 'idle',
    errorMessage: null,
    isActive: false,
  });

  const offsetRef = useRef<HeadOffset>({ x: 0, y: 0, z: 0 });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const landmarkerRef = useRef<unknown>(null);
  const neutralRef = useRef<{ x: number; y: number; faceSize: number } | null>(null);
  const smoothedRef = useRef<HeadOffset>({ x: 0, y: 0, z: 0 });
  const lastProcessTimeRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(false);
  const processingLoopRef = useRef<(() => void) | null>(null);

  // Live config + status mirrors. The render loop is created once inside
  // `enable()`, so it must read these refs instead of the closure values —
  // otherwise slider changes (sensitivity, invert) never reach the loop.
  const configRef = useRef<HeadTrackingConfig>(config);
  const stateRef = useRef<HeadTrackingState>(state);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setStatus = (
    status: TrackingStatus,
    errorMessage: string | null = null
  ) => {
    setState({
      status,
      errorMessage,
      isActive: status === 'active' || status === 'no-face',
    });
  };

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    processingLoopRef.current = null;
  }, []);

  const disable = useCallback(() => {
    enabledRef.current = false;
    stopWebcam();
    offsetRef.current = { x: 0, y: 0, z: 0 };
    smoothedRef.current = { x: 0, y: 0, z: 0 };
    neutralRef.current = null;
    setStatus('disabled');
  }, [stopWebcam]);

  const recenter = useCallback(() => {
    neutralRef.current = null;
  }, []);

  const enable = useCallback(async () => {
    if (enabledRef.current) return;
    enabledRef.current = true;

    setStatus('requesting');

    // Request webcam
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Webcam permission denied or no camera found.';
      setStatus('error', msg);
      enabledRef.current = false;
      return;
    }

    if (!enabledRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;

    // Create hidden video element
    const video = document.createElement('video');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.muted = true;
    video.srcObject = stream;
    video.style.position = 'absolute';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    document.body.appendChild(video);
    videoRef.current = video;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(() => resolve());
      };
    });

    setStatus('initializing');

    // Dynamic import of MediaPipe — only in browser
    let FaceLandmarker: unknown;
    let FilesetResolver: unknown;
    try {
      // Re-apply: the WASM glue binds console.error when the module is
      // evaluated, so the filter has to be in place before that happens.
      installTfliteLogFilter();
      const mpVision = await import('@mediapipe/tasks-vision');
      FaceLandmarker = mpVision.FaceLandmarker;
      FilesetResolver = mpVision.FilesetResolver;
    } catch {
      setStatus(
        'error',
        'Failed to load MediaPipe. Check your internet connection or use a compatible browser.'
      );
      stopWebcam();
      enabledRef.current = false;
      return;
    }

    if (!enabledRef.current) {
      stopWebcam();
      return;
    }

    try {
      // @ts-expect-error dynamic import
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      // @ts-expect-error dynamic import
      const landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      landmarkerRef.current = landmarker;
    } catch {
      setStatus('error', 'MediaPipe Face Landmarker failed to initialize.');
      stopWebcam();
      enabledRef.current = false;
      return;
    }

    if (!enabledRef.current) {
      stopWebcam();
      return;
    }

    setStatus('active');

    const processFrame = () => {
      if (!enabledRef.current || !videoRef.current || !landmarkerRef.current) return;

      const cfg = configRef.current;
      const sens = cfg.sensitivity;
      const video = videoRef.current;
      const now = performance.now();
      if (
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        now - lastProcessTimeRef.current >= cfg.processIntervalMs
      ) {
        lastProcessTimeRef.current = now;

        try {
          // @ts-expect-error dynamic mp type
          const results = landmarkerRef.current.detectForVideo(video, now);

          if (results?.faceLandmarks?.length > 0) {
            const lm = results.faceLandmarks[0];
            const noseTip = lm[NOSE_TIP_INDEX];
            const leftEye = lm[LEFT_EYE_INDEX];
            const rightEye = lm[RIGHT_EYE_INDEX];

            // Estimate face size from eye distance
            const faceSize = Math.abs(rightEye.x - leftEye.x);

            // Calibrate neutral on first valid detection
            if (!neutralRef.current) {
              neutralRef.current = {
                x: noseTip.x,
                y: noseTip.y,
                faceSize,
              };
            }

            const neutral = neutralRef.current;

            // Inverted movement multipliers (default inverted = -1, normal = 1)
            const invertSign = cfg.invertMovement !== false ? -1 : 1;
            const invertYSign = cfg.invertY !== false ? -1 : 1;

            // Normalized head deflection, independent of sensitivity.
            // ±1 = head moved across the full tracking range.
            const rawX = clamp((noseTip.x - neutral.x) / 0.28, -1, 1) * invertSign;
            // Inverted up and down as requested
            const rawY = clamp((noseTip.y - neutral.y) / 0.20, -1, 1) * invertYSign;
            // Depth: larger face = closer to screen
            const depthDelta = (faceSize - neutral.faceSize) / neutral.faceSize;
            const rawZ = clamp(depthDelta * 2, -1, 1) * invertSign;

            // Deadzone is defined in output space, so scale it back into
            // deflection space to keep it constant as sensitivity changes.
            const dz = Math.min(1, cfg.deadZone / Math.max(sens, 0.01));

            // Apply smooth cubic deadzone (eliminates center flutter and edge stepping)
            const targetX = smoothDeadzone(rawX, dz);
            const targetY = smoothDeadzone(rawY, dz);
            const targetZ = smoothDeadzone(rawZ, dz);

            // Adaptive filtering: strongly suppress micro-tremors when still,
            // but react immediately without lag when moving
            const dx = targetX - smoothedRef.current.x;
            const dy = targetY - smoothedRef.current.y;
            const dzVal = targetZ - smoothedRef.current.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dzVal * dzVal);

            // When distance is small (<0.03, noise), alpha is 0.06 (heavily smoothed)
            // When distance increases (intentional movement), alpha smoothly opens up to 0.25
            const minAlpha = 0.06;
            const maxAlpha = 0.25;
            const motionBlend = clamp(dist / 0.12, 0, 1);
            const alpha = minAlpha + (maxAlpha - minAlpha) * motionBlend;

            smoothedRef.current.x += dx * alpha;
            smoothedRef.current.y += dy * alpha;
            smoothedRef.current.z += dzVal * alpha;

            // Sensitivity is applied last so it is a true end-to-end gain:
            // raising it scales the camera travel instead of just saturating
            // the clamp earlier.
            offsetRef.current = {
              x: smoothedRef.current.x * sens,
              y: smoothedRef.current.y * sens,
              z: smoothedRef.current.z * sens,
            };

            if (stateRef.current.status === 'no-face') setStatus('active');
          } else {
            // No face — gradually decay offset
            smoothedRef.current.x *= 0.95;
            smoothedRef.current.y *= 0.95;
            smoothedRef.current.z *= 0.95;
            offsetRef.current = {
              x: smoothedRef.current.x * sens,
              y: smoothedRef.current.y * sens,
              z: smoothedRef.current.z * sens,
            };
            if (stateRef.current.status === 'active') setStatus('no-face');
          }
        } catch {
          // Ignore per-frame errors
        }
      }

      rafRef.current = requestAnimationFrame(processFrame);
    };

    processingLoopRef.current = processFrame;
    rafRef.current = requestAnimationFrame(processFrame);
  }, [stopWebcam]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enabledRef.current = false;
      stopWebcam();
    };
  }, [stopWebcam]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && enabledRef.current) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      } else if (!document.hidden && enabledRef.current && landmarkerRef.current) {
        // Resume the original processing loop (not a no-op replacement).
        const loop = processingLoopRef.current;
        if (loop) rafRef.current = requestAnimationFrame(loop);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return {
    state,
    offsetRef,
    enable,
    disable,
    recenter,
  };
}
