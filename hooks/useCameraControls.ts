
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

  const reset = useCallback(() => {
    setPast(p => [...p, state]);
    setFuture([]);
    setState(DEFAULT_CAMERA_STATE);
  }, [state]);

  const buildCameraPrompt = useCallback((s: CameraControlState): string => {
    // PHASE 1: IDENTITY LOCK (Preserve Biometrics)
    const identityLock = "IDENTITY_RECONSTRUCTION_MODE: Keep the person's face structure, facial hair, skin pores, and eye color 100% consistent with the source. Do not beautify or alter bone structure.";
    
    // PHASE 2: SPATIAL TRANSFORMATION (Mathematics of the angle)
    const segments: string[] = [];
    const angle = Math.abs(s.rotate);
    const dir = s.rotate > 0 ? "right" : "left";
    
    if (angle > 5) {
      segments.push(`SPATIAL_ORBIT: Rotate camera ${angle} degrees to the ${dir}. Calculate the correct ear-to-nose perspective ratio for this specific rotation.`);
    }

    if (s.tilt > 0.6) {
      segments.push("ZENITH_VIEW: Camera positioned at 90 degrees above the subject. Emphasize the top of the head and shoulder line.");
    } else if (s.tilt < -0.6) {
      segments.push("HERO_SHOT_LOW_ANGLE: Position camera near floor level looking up. Exaggerate chin and neck-line power while maintaining facial recognition.");
    }

    // PHASE 3: OPTICAL PROFILE (Lens Physics)
    const optics = s.wideAngle 
      ? "LENS_PROFILE: 14mm rectilinear wide-angle. Edge stretching active. High environmental context."
      : "LENS_PROFILE: 85mm prime. Compressed background. Shallow depth of field (f/1.4). Focal plane locked on eyes.";

    // PHASE 4: PHYSICS OVERRIDES
    if (s.floating) {
      segments.push("PHYSICS_OVERRIDE: Disable gravity for the subject. Hair strands should lift slightly. Detach shadows from the floor to show 20cm levitation.");
    }

    const dolly = s.forward > 7 ? "CLOSE_UP: Tight framing on the face." : s.forward < 3 ? "WIDE_SHOT: Full upper body visible." : "";

    return `[ENGINE_V6_SYNTHESIS] 
${identityLock} 
${optics} 
${segments.join(" ")} 
${dolly} 
FINAL_TASK: Synthesize the image from this exact NEW camera coordinate while keeping the same person.`;
  }, []);

  const generatedPrompt = useMemo(() => buildCameraPrompt(state), [state, buildCameraPrompt]);

  return {
    state,
    updateState,
    reset,
    generatedPrompt
  };
};
