
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 2000;

const SYSTEM_INSTRUCTION = `You are a high-end spatial intelligence and image synthesis engine. 
YOUR PRIMARY GOAL: Generate a NEW image based on the source image and provided camera telemetry.

CRITICAL CONSTRAINTS:
1. OUTPUT: You must synthesize the image first.
2. IDENTITY: Maintain the exact face structure, skin texture, and eye color. The person must be 100% recognizable.
3. OPTICS: Apply realistic lens effects (e.g., edge distortion for 14mm, compression for 85mm).
4. ANALYSIS (RU): Provide a very brief technical analysis of the new perspective AFTER the image generation or as a separate part.
5. FORMAT: Strictly 1:1 aspect ratio.`;

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
    
    // Create a new instance right before the call to ensure the latest API key is used
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
          text: `[RENDER_COMMAND]
SOURCE_LOCK: TRUE
CAMERA_TELEMETRY: ${cameraPrompt}
SEED: ${settings.seed}
STYLE_BIAS: ${settings.creativeContext || "Professional Studio Photography"}
EXECUTION: SYNTHESIZE_NOW`
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
