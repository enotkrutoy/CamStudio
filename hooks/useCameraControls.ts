
import { useState, useCallback, useMemo } from 'react';
import { CameraControlState } from '../types';
import { DEFAULT_CAMERA_STATE } from '../constants';

export const useCameraControls = () => {
  const [state, setState] = useState<CameraControlState>(DEFAULT_CAMERA_STATE);

  const updateState = useCallback((updates: Partial<CameraControlState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setState(DEFAULT_CAMERA_STATE);
  }, []);

  const buildCameraPrompt = useCallback((s: CameraControlState): string => {
    const segments: string[] = [];

    // Optical Core Directives
    if (s.floating) {
      segments.push("PHYSICS_OVERRIDE: Enable zero-gravity for primary subject. Position: 50cm vertical offset from ground plane. Render high-fidelity ambient occlusion (AO) and soft contact shadows on the floor. No visible supports.");
    } else if (s.rotate === 0 && s.forward === 0 && s.tilt === 0 && !s.wideAngle) {
      return "no camera movement";
    }

    // Rotation & Orbit
    if (s.rotate !== 0) {
      const direction = s.rotate > 0 ? "clockwise" : "counter-clockwise";
      segments.push(`ORBIT_TRANSFORM: Pivot camera ${Math.abs(s.rotate)} degrees ${direction} around the center of interest. Recalculate global illumination for new azimuth.`);
    }

    // Dolly / Zoom
    if (s.forward > 5) {
      segments.push("DOLLY_IN: Move camera to extreme close-up (macro range). Increase depth of field (DoF) blur on background.");
    } else if (s.forward > 2) {
      segments.push("DOLLY_IN: Advance camera to medium-shot range. Tighten perspective lines.");
    }

    // Pitch & Tilt
    if (s.tilt > 0.4) {
      segments.push("PITCH_TRANSFORM: High-angle 'God view' perspective looking down 45 degrees. Compress vertical subject data.");
    } else if (s.tilt < -0.4) {
      segments.push("PITCH_TRANSFORM: Low-angle 'Hero shot' perspective looking up. Exaggerate subject height and grandeur.");
    }

    // Lens Characteristics
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
    generatedPrompt
  };
};
