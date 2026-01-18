import { useState, useCallback, useMemo } from 'react';
import { CameraControlState } from '../types';
import { DEFAULT_CAMERA_STATE } from '../constants';

export const useCameraControls = () => {
  const [state, setState] = useState<CameraControlState>(DEFAULT_CAMERA_STATE);
  const [past, setPast] = useState<CameraControlState[]>([]);
  const [future, setFuture] = useState<CameraControlState[]>([]);

  const updateState = useCallback((updates: Partial<CameraControlState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Only save to history if something actually changed and it's not a tiny jitter
      const hasChanged = Object.entries(updates).some(([key, value]) => (prev as any)[key] !== value);
      
      if (hasChanged) {
        setPast(p => [...p, prev].slice(-50)); // Limit history to 50 steps
        setFuture([]);
      }
      return newState;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(f => [state, ...f]);
    setPast(newPast);
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast(p => [...p, state]);
    setFuture(newFuture);
    setState(next);
  }, [future, state]);

  const reset = useCallback(() => {
    setPast(p => [...p, state]);
    setFuture([]);
    setState(DEFAULT_CAMERA_STATE);
  }, [state]);

  const buildCameraPrompt = useCallback((s: CameraControlState): string => {
    const segments: string[] = [];

    if (s.floating) {
      segments.push("PHYSICS_OVERRIDE: Enable zero-gravity for primary subject. Position: 50cm vertical offset from ground plane. Render high-fidelity ambient occlusion (AO) and soft contact shadows on the floor. No visible supports.");
    } else if (s.rotate === 0 && s.forward === 0 && s.tilt === 0 && !s.wideAngle) {
      return "no camera movement";
    }

    if (s.rotate !== 0) {
      const direction = s.rotate > 0 ? "clockwise" : "counter-clockwise";
      segments.push(`ORBIT_TRANSFORM: Pivot camera ${Math.abs(s.rotate)} degrees ${direction} around the center of interest. Recalculate global illumination for new azimuth.`);
    }

    if (s.forward > 5) {
      segments.push("DOLLY_IN: Move camera to extreme close-up (macro range). Increase depth of field (DoF) blur on background.");
    } else if (s.forward > 2) {
      segments.push("DOLLY_IN: Advance camera to medium-shot range. Tighten perspective lines.");
    }

    if (s.tilt > 0.4) {
      segments.push("PITCH_TRANSFORM: High-angle 'God view' perspective looking down 45 degrees. Compress vertical subject data.");
    } else if (s.tilt < -0.4) {
      segments.push("PITCH_TRANSFORM: Low-angle 'Hero shot' perspective looking up. Exaggerate subject height and grandeur.");
    }

    if (s.wideAngle) {
      segments.push("OPTICS_PROFILE: 14mm Ultra-wide lens. Apply subtle radial barrel distortion. Enhance peripheral environment detail and stretch vanishing points.");
    } else {
      segments.push("OPTICS_PROFILE: 50mm Prime lens. Natural perspective, zero distortion, human-eye field of view.");
    }

    return segments.join(" ");
  }, []);

  const generatedPrompt = useMemo(() => buildCameraPrompt(state), [state, buildCameraPrompt]);

  return {
    state,
    updateState,
    reset,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    generatedPrompt
  };
};