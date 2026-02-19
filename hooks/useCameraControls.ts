
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
    
    // ORBIT Analysis
    const angle = Math.abs(s.rotate);
    const dir = s.rotate > 0 ? "RIGHT" : "LEFT";
    if (angle > 5) {
      segments.push(`SPATIAL_ORBIT: Adjust camera to a ${angle}-degree angle from the ${dir}.`);
    } else {
      segments.push(`FRONTAL_AXIS: Align camera strictly along the frontal Z-axis.`);
    }

    // DOLLY / FOV Analysis
    if (s.forward > 8) {
      segments.push("DOLLY_MACRO: Move lens extremely close to capture sub-millimeter textures and branding details.");
    } else if (s.forward < 2) {
      segments.push("DOLLY_ESTABLISHING: Pull back to reveal the object's surrounding environment and scale.");
    } else {
      segments.push("STANDARD_CATALOG_DISTANCE: Maintain consistent studio product framing.");
    }

    // TILT Analysis
    if (s.tilt > 0.7) {
      segments.push("ZENITH_PERSPECTIVE: A 90-degree top-down view looking directly at the floor plane.");
    } else if (s.tilt < -0.7) {
      segments.push("HERO_LOW_ANGLE: A dramatic low-ground perspective looking up, emphasizing status and scale.");
    } else if (Math.abs(s.tilt) > 0.1) {
      segments.push(`TILT_PHASE: Adjust vertical pitch by ${s.tilt.toFixed(2)} units for cinematic depth.`);
    }

    // OPTICS Phase
    const optics = s.wideAngle 
      ? "LENS_SPEC: 14mm Ultra-wide optics with slight spherical distortion and deep depth of field."
      : "LENS_SPEC: 50mm Prime lens characteristics with natural bokeh and zero distortion.";

    // IDENTITY LOCK SEGMENT
    const identityLock = "IDENTITY_PRESERVATION: LOCK_GEOMETRY, LOCK_LABELS, LOCK_TEXTURES. Output must be a direct transformation of the input object.";

    return `[ENGINE_COMMAND_V6] ${segments.join(" ")} ${optics} ${identityLock}`;
  }, []);

  const generatedPrompt = useMemo(() => buildCameraPrompt(state), [state, buildCameraPrompt]);

  return {
    state,
    updateState,
    reset,
    generatedPrompt
  };
};
