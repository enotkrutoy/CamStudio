

export interface CameraControlState {
  rotate: number; // -90 to 90
  forward: number; // 0 to 10
  tilt: number; // -1 to 1
  wideAngle: boolean;
  floating: boolean;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface GenerationSettings {
  seed: number;
  height: number;
  width: number;
  steps: number;
  quality: 'flash' | 'pro';
  imageSize?: ImageSize;
  creativeContext?: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
  name: string;
  size: number;
  dimensions?: { width: number; height: number };
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GenerationResult {
  id: string;
  imageUrl: string;
  prompt: string;
  timestamp: number;
  settings: GenerationSettings;
  cameraState: CameraControlState;
  groundingChunks?: GroundingChunk[];
}

export type CameraPreset = 'default' | 'birdseye' | 'dutch' | 'macro' | 'low-angle' | 'wide-orbit' | 'top-down' | 'cinematic-zoom';

export interface PresetDefinition {
  id: CameraPreset;
  label: string;
  icon: string;
  state: Partial<CameraControlState>;
  description: string;
}