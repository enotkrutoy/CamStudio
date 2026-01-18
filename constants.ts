
import { CameraControlState, GenerationSettings, CameraPreset, PresetDefinition } from './types';

export const DEFAULT_CAMERA_STATE: CameraControlState = {
  rotate: 0,
  forward: 0,
  tilt: 0,
  wideAngle: false,
  floating: false,
};

export const PRESET_LIST: PresetDefinition[] = [
  {
    id: 'default',
    label: 'Стандарт',
    icon: '📸',
    description: 'Классический портретный ракурс на уровне глаз.',
    state: DEFAULT_CAMERA_STATE
  },
  {
    id: 'birdseye',
    label: 'Вид сверху',
    icon: '🦅',
    description: 'Высокая точка съемки, подчеркивающая геометрию сцены.',
    state: { rotate: 0, forward: 2, tilt: 0.9, wideAngle: true, floating: false }
  },
  {
    id: 'dutch',
    label: 'Голландский угол',
    icon: '📐',
    description: 'Драматический наклон камеры для создания напряжения.',
    state: { rotate: 15, forward: 3, tilt: -0.2, wideAngle: false, floating: false }
  },
  {
    id: 'macro',
    label: 'Макро',
    icon: '🔍',
    description: 'Экстремальное приближение к деталям лица.',
    state: { rotate: 0, forward: 8.5, tilt: 0, wideAngle: false, floating: false }
  },
  {
    id: 'low-angle',
    label: 'Героический',
    icon: '🛡️',
    description: 'Снизу вверх. Придает субъекту величие и доминирование.',
    state: { rotate: 0, forward: 4, tilt: -0.8, wideAngle: true, floating: false }
  },
  {
    id: 'wide-orbit',
    label: 'Орбитальный',
    icon: '🔄',
    description: 'Динамичный облет с широким охватом пространства.',
    state: { rotate: 45, forward: 1, tilt: 0.3, wideAngle: true, floating: false }
  },
  {
    id: 'top-down',
    label: 'Зенит',
    icon: '📍',
    description: 'Строго вертикальный взгляд вниз.',
    state: { rotate: 0, forward: 0, tilt: 1, wideAngle: true, floating: false }
  }
];

export const PRESETS: Record<CameraPreset, Partial<CameraControlState>> = 
  PRESET_LIST.reduce((acc, p) => ({ ...acc, [p.id]: p.state }), {} as any);

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
