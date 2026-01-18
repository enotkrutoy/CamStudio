
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

    // Feature: Zero-G Levitation
    if (s.floating) {
      segments.push("GRAVITY_OFF: The subject is suspended in mid-air, 50cm above the surface. Shadows are detached and softened. Hair and loose fabric exhibit slight micro-gravity behavior.");
    }

    // Perspective & Lens Profile
    if (s.wideAngle) {
      segments.push("ULTRA_WIDE_OPTICS: 14mm focal length. Exaggerated perspective, rectilinear distortion at frame edges, expanded peripheral space. Foreground subject dominates the composition.");
    } else {
      segments.push("PORTRAIT_TELEPHOTO: 85mm prime lens. Compressed depth, minimal facial distortion, buttery bokeh (f/1.2) separating subject from background.");
    }

    // Azimuth / Rotation
    if (Math.abs(s.rotate) > 5) {
      const dir = s.rotate > 0 ? "right" : "left";
      segments.push(`AZIMUTH_SHIFT: Pivot camera ${Math.abs(s.rotate)} degrees to the ${dir}. Reveal hidden facets of the subject's profile. Adjust light falloff on the shadowed side.`);
    }

    // Depth / Dolly
    if (s.forward > 7.5) {
      segments.push("EXTREME_CLOSE_UP: Macro focusing. Pores, iris details, and fine textures are enhanced. Depth of field is razor-thin.");
    } else if (s.forward > 2) {
      segments.push(`DOLLY_IN: Move camera significantly closer. The background recedes as the subject fills the frame.`);
    }

    // Pitch / Tilt
    if (s.tilt > 0.6) {
      segments.push("TOP_DOWN_ZENITH: Camera is positioned directly above. Emphasize vertical symmetry and the top-down geometry of the head and shoulders.");
    } else if (s.tilt < -0.6) {
      segments.push("LOW_ANGLE_MIGHT: Shooting from below. Subject appears towering and heroic. Perspective lines converge upward.");
    }

    // Special: Cinematic "Dolly Zoom" if conditions met
    if (s.wideAngle && s.forward > 5 && Math.abs(s.rotate) < 15) {
      return "CINEMATIC_DOLLY_ZOOM: Execute a Hitchcockian Vertigo effect. Background stretches and warps while the subject remains locked in scale. High-intensity parallax shift.";
    }

    return segments.length > 0 ? segments.join(" ") : "STANDARD_EYE_LEVEL_SCAN: Maintain original perspective with high-fidelity texture pass.";
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
