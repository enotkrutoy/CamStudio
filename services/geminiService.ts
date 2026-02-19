
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 2000;

const SYSTEM_INSTRUCTION = `You are the QwenCam Identity Preservation Engine V6.
MISSION: Re-render the provided object from a NEW spatial perspective with mathematical precision.

PHASE 0: ANALYSIS
- Detect the core subject, its material properties, and specific branding/textures.

PHASE 1: IDENTITY LOCK (CRITICAL)
- 100% Biometric/Material consistency. 
- Do NOT change the product's shape, labels, scratches, or wear-and-tear.
- Preservation of original color palette and saturation levels.

PHASE 2: SPATIAL TRANSFORMATION
- Apply specific camera movement: ORBIT, DOLLY, or TILT.
- Adjust lighting dynamically to match the new perspective (ray-tracing simulation).

PHASE 3: OPTICS
- Mimic high-end smartphone lenses (iPhone 16 Pro). 
- Natural depth of field, subtle grain, no "AI-gloss".`;

export class GeminiService {
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings,
    onRetry?: (seconds: number) => void
  ): Promise<{ imageUrl?: string; modelResponse?: string; groundingChunks?: GroundingChunk[] }> {
    let lastError: any;
    
    // Create fresh instance for latest API Key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPro = settings.quality === 'pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: sourceImage.mimeType,
            data: sourceImage.base64.split(',')[1],
          },
        };

        const textPart = {
          text: `[ENGINE_TASK_SYNC]
SPATIAL_TELEMETRY: ${cameraPrompt}
SEED: ${settings.seed}
LENS: Smartphone Main (24mm equiv.)
ENVIRONMENT: ${settings.creativeContext || "Professional marketplace studio, neutral daylight"}
IDENTITY_PRESERVATION: LOCK_ACTIVE`
        };

        const config: any = {
          imageConfig: { 
            aspectRatio: "1:1",
            imageSize: isPro ? (settings.imageSize || '1K') : undefined
          },
          systemInstruction: SYSTEM_INSTRUCTION
        };

        if (isPro) {
          config.tools = [{ googleSearch: {} }];
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, textPart] },
          config
        });

        let imageUrl: string | undefined = undefined;
        let modelResponse = '';
        const candidate = response.candidates?.[0];
        
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            } else if (part.text) {
              modelResponse += part.text;
            }
          }
        }

        return { 
          imageUrl, 
          modelResponse: modelResponse || response.text || '',
          groundingChunks: candidate?.groundingMetadata?.groundingChunks as GroundingChunk[]
        };

      } catch (error: any) {
        lastError = error;
        const msg = error.message?.toLowerCase() || '';
        if ((msg.includes("429") || msg.includes("quota")) && attempt < MAX_RETRIES - 1) {
          const waitTime = INITIAL_BACKOFF * (attempt + 1);
          if (onRetry) onRetry(Math.ceil(waitTime / 1000));
          await this.sleep(waitTime);
          continue;
        }
        if (msg.includes("not found") || msg.includes("api key") || msg.includes("authentication")) {
          throw new Error("AUTH_REQUIRED");
        }
        break;
      }
    }
    throw lastError;
  }
}

export const geminiService = new GeminiService();
