
import { CameraControlState, GenerationSettings, CameraPreset } from './types';

export const DEFAULT_CAMERA_STATE: CameraControlState = {
  rotate: 0,
  forward: 0,
  tilt: 0,
  wideAngle: false,
  floating: false,
};

export const PRESETS: Record<CameraPreset, Partial<CameraControlState>> = {
  'default': DEFAULT_CAMERA_STATE,
  'birdseye': { rotate: 0, forward: 2, tilt: 0.9, wideAngle: true, floating: false },
  'dutch': { rotate: 15, forward: 3, tilt: -0.2, wideAngle: false, floating: false },
  'macro': { rotate: 0, forward: 8, tilt: 0, wideAngle: false, floating: false },
  'low-angle': { rotate: 0, forward: 4, tilt: -0.8, wideAngle: true, floating: false },
  'wide-orbit': { rotate: 45, forward: 1, tilt: 0.3, wideAngle: true, floating: false },
};

export const DEFAULT_SETTINGS: GenerationSettings = {
  seed: Math.floor(Math.random() * 2147483647),
  height: 1024,
  width: 1024,
  steps: 4,
  quality: 'flash',
  imageSize: '1K',
  creativeContext: '',
};

export const ROTATE_LIMITS = { min: -90, max: 90 };
export const FORWARD_LIMITS = { min: 0, max: 10 };
export const TILT_LIMITS = { min: -1, max: 1 };
export const DIMENSION_LIMITS = { min: 256, max: 1024, step: 64 };
export const STEPS_LIMITS = { min: 1, max: 40 };

export const MODELS = {
  flash: 'gemini-2.5-flash-image',
  pro: 'gemini-3-pro-image-preview'
};
