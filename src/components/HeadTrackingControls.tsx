/**
 * HeadTrackingControls — UI panel for webcam head tracking.
 */

'use client';

import type { HeadTrackingState } from '@/hooks/useHeadTracking';

interface HeadTrackingControlsProps {
  state: HeadTrackingState;
  onEnable: () => void;
  onDisable: () => void;
  onRecenter: () => void;
  sensitivity: number;
  onSensitivityChange: (v: number) => void;
  invertMovement: boolean;
  onToggleInvert: () => void;
}

function StatusDot({ status }: { status: HeadTrackingState['status'] }) {
  const color =
    status === 'active'
      ? '#48bb78'
      : status === 'no-face'
      ? '#ed8936'
      : status === 'error'
      ? '#fc8181'
      : status === 'initializing' || status === 'requesting'
      ? '#63b3ed'
      : '#4a5568';

  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        marginRight: 6,
        flexShrink: 0,
        boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
      }}
    />
  );
}

const STATUS_LABELS: Record<HeadTrackingState['status'], string> = {
  idle: 'Click to enable head tracking',
  requesting: 'Requesting webcam access…',
  initializing: 'Loading face tracker…',
  active: 'Tracking active',
  'no-face': 'No face detected',
  error: 'Error',
  disabled: 'Head tracking off',
};

export function HeadTrackingControls({
  state,
  onEnable,
  onDisable,
  onRecenter,
  sensitivity,
  onSensitivityChange,
  invertMovement,
  onToggleInvert,
}: HeadTrackingControlsProps) {
  const isActive = state.isActive;
  const isBusy =
    state.status === 'requesting' || state.status === 'initializing';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 220,
      }}
    >
      {/* Status line */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        <StatusDot status={state.status} />
        <span>
          {state.status === 'error' && state.errorMessage
            ? state.errorMessage
            : STATUS_LABELS[state.status]}
        </span>
      </div>

      {/* Enable / Disable button */}
      <button
        id="head-tracking-toggle"
        onClick={isActive || isBusy ? onDisable : onEnable}
        disabled={isBusy}
        aria-label={
          isActive ? 'Disable head tracking' : 'Enable head tracking'
        }
        style={{
          padding: '7px 14px',
          background: isActive
            ? 'rgba(252, 129, 129, 0.15)'
            : 'rgba(99, 179, 237, 0.15)',
          color: isActive ? '#fc8181' : '#63b3ed',
          border: `1px solid ${isActive ? 'rgba(252, 129, 129, 0.35)' : 'rgba(99, 179, 237, 0.35)'}`,
          borderRadius: 6,
          cursor: isBusy ? 'wait' : 'pointer',
          fontSize: 12,
          fontFamily: 'inherit',
          transition: 'all 0.2s',
          opacity: isBusy ? 0.6 : 1,
          backdropFilter: 'blur(4px)',
          letterSpacing: '0.04em',
        }}
      >
        {isActive ? '⏹ Disable Head Tracking' : '⊙ Enable Head Tracking'}
      </button>

      {/* Recenter & Invert buttons (only when active) */}
      {isActive && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            id="head-tracking-recenter"
            onClick={onRecenter}
            aria-label="Recenter head tracking"
            style={{
              flex: 1,
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.07)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            ◎ Recenter
          </button>
          <button
            id="head-tracking-invert"
            onClick={onToggleInvert}
            aria-label="Toggle invert movement"
            title="Toggle between inverted and normal movement"
            style={{
              padding: '5px 10px',
              background: invertMovement
                ? 'rgba(99, 179, 237, 0.18)'
                : 'rgba(255, 255, 255, 0.07)',
              color: invertMovement ? '#63b3ed' : 'rgba(255,255,255,0.7)',
              border: `1px solid ${invertMovement ? 'rgba(99, 179, 237, 0.45)' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            ⇅ Invert: {invertMovement ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Sensitivity slider (only when active) */}
      {isActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label
            htmlFor="ht-sensitivity"
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}
          >
            Sensitivity
          </label>
          <input
            id="ht-sensitivity"
            type="range"
            min={0.2}
            max={2.0}
            step={0.05}
            value={sensitivity}
            onChange={(e) => onSensitivityChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#63b3ed', cursor: 'pointer' }}
          />
          <span
            style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', minWidth: 24 }}
          >
            {sensitivity.toFixed(2)}x
          </span>
        </div>
      )}
    </div>
  );
}
