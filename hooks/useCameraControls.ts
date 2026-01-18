
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
      const hasChanged = Object.entries(updates).some(([key, value]) => (prev as any)[key] !== value);
      
      if (hasChanged) {
        setPast(p => [...p, prev].slice(-50));
        setFuture([]);
      }
      return newState;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(f => [state, ...f]);
    setPast(past.slice(0, past.length - 1));
    setState(previous);
  }, [past, state]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(p => [...p, state]);
    setFuture(future.slice(1));
    setState(next);
  }, [future, state]);

  const reset = useCallback(() => {
    setPast(p => [...p, state]);
    setFuture([]);
    setState(DEFAULT_CAMERA_STATE);
  }, [state]);

  const buildCameraPrompt = useCallback((s: CameraControlState): string => {
    const segments: string[] = [];

    // Special Case: Dolly Zoom / Cinematic Effect
    if (s.wideAngle && s.forward > 6 && Math.abs(s.rotate) < 10 && Math.abs(s.tilt) < 0.2) {
      return "DOLLY_ZOOM_RECONSTRUCTION: Simulate a Hitchcock 'Vertigo' effect. Fast camera movement towards subject while simultaneously widening field-of-view (12mm). Background should appear to peel away while subject remains fixed size. Hyper-realistic parallax.";
    }

    if (s.floating) {
      segments.push("PHYSICS_OVERRIDE: Enable zero-gravity levitation for the subject. Offset height: +60cm from ground. Add ethereal sub-surface scattering and soft atmospheric haze beneath the subject. No contact points.");
    }

    if (s.rotate !== 0) {
      const direction = s.rotate > 0 ? "clockwise" : "counter-clockwise";
      segments.push(`AZIMUTH_TRANSFORM: Pivot camera ${Math.abs(s.rotate)}° ${direction}. Recalculate volumetric lighting and ray-traced reflections based on the new angular position.`);
    }

    if (s.forward > 8) {
      segments.push("MACRO_FOCUS: Distance < 30cm. Shallow depth of field (f/1.4). Focus on micro-textures and intricate surface details. High-frequency detail enhancement.");
    } else if (s.forward > 3) {
      segments.push(`DOLLY_IN: Move camera to ${10 - s.forward}m distance. Compress spatial depth, increase subject presence.`);
    }

    if (s.tilt > 0.5) {
      segments.push("ZENITH_PERSPECTIVE: Extreme top-down angle. Flatten subject proportions, emphasize floor geometry and layout patterns.");
    } else if (s.tilt < -0.5) {
      segments.push("LOW_ANGLE_HERO: Extreme upward tilt. Exaggerate vertical scale and power dynamics. Lengthen perspective lines.");
    }

    if (s.wideAngle) {
      segments.push("OPTICS: 14mm rectilinear ultra-wide lens profile. Intentional corner stretching, enhanced peripheral vision, deep focus across all planes.");
    } else {
      segments.push("OPTICS: 85mm portrait telephoto lens profile. Flat perspective, natural compression, creamy bokeh on background elements.");
    }

    return segments.length > 0 ? segments.join(" ") : "no camera movement";
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
