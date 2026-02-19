
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
    label: 'Маркетплейс',
    icon: '📦',
    description: 'Стандартный вид спереди. Четкая форма и естественный свет.',
    state: DEFAULT_CAMERA_STATE
  },
  {
    id: 'wide-orbit',
    label: 'Вид 3/4',
    icon: '📐',
    description: 'Классический объемный ракурс для демонстрации формы.',
    state: { rotate: 45, forward: 3, tilt: 0.1, wideAngle: false, floating: false }
  },
  {
    id: 'top-down',
    label: 'Флэтлэй',
    icon: '📍',
    description: 'Вид строго сверху для каталога или лайфстайл-съемки.',
    state: { rotate: 0, forward: 0, tilt: 1, wideAngle: true, floating: false }
  },
  {
    id: 'macro',
    label: 'Детали',
    icon: '🔍',
    description: 'Макро-съемка текстур, швов или материалов.',
    state: { rotate: 0, forward: 9, tilt: 0, wideAngle: false, floating: false }
  },
  {
    id: 'low-angle',
    label: 'Динамика',
    icon: '🚀',
    description: 'Ракурс снизу вверх для обуви или статусных аксессуаров.',
    state: { rotate: 0, forward: 5, tilt: -0.8, wideAngle: true, floating: false }
  },
  {
    id: 'cinematic-zoom',
    label: 'Портрет',
    icon: '📱',
    description: 'Имитация портретного режима iPhone с мягким размытием.',
    state: { rotate: 0, forward: 6, tilt: 0, wideAngle: false, floating: false }
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
  creativeContext: 'iPhone 15 Pro, natural daylight, photorealistic, 4k, retail photography',
};

export const ROTATE_LIMITS = { min: -90, max: 90 };
export const FORWARD_LIMITS = { min: 0, max: 10 };
export const TILT_LIMITS = { min: -1, max: 1 };
export const DIMENSION_LIMITS = { min: 256, max: 1024, step: 64 };

export const MODELS = {
  flash: 'gemini-2.5-flash-image',
  pro: 'gemini-3-pro-image-preview'
};
