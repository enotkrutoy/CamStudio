
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 2000; // 2 секунды

export class GeminiService {
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings,
    onRetry?: (seconds: number) => void
  ): Promise<{ imageUrl: string; groundingChunks?: GroundingChunk[] }> {
    let lastError: any;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // [Проблема] Инициализация GoogleGenAI с возможным пустым значением API_KEY.
        // [Диагностика] Правила требуют использования process.env.API_KEY напрямую.
        // [Решение] Убираем fallback и используем process.env.API_KEY как единственный источник.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const isPro = settings.quality === 'pro';
        const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
        
        const imagePart = {
          inlineData: {
            mimeType: sourceImage.mimeType,
            data: sourceImage.base64.split(',')[1],
          },
        };

        const textPart = {
          text: `[SPATIAL_RECONSTRUCTION]
PERSPECTIVE: ${cameraPrompt}
SEED: ${settings.seed}
STABILITY: ULTRA
CONTEXT: ${settings.creativeContext || "Maintain scene integrity"}`
        };

        const config: any = {
          imageConfig: { aspectRatio: "1:1" }
        };

        if (isPro) {
          config.imageConfig.imageSize = settings.imageSize || '1K';
          config.tools = [{ googleSearch: {} }];
        }

        const response: GenerateContentResponse = await ai.models.generateContent({
          model: modelName,
          contents: { parts: [imagePart, textPart] },
          config
        });

        let imageUrl = '';
        const candidate = response.candidates?.[0];
        
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        }

        if (!imageUrl) throw new Error("EMPTY_RESPONSE");

        return { 
          imageUrl, 
          groundingChunks: candidate?.groundingMetadata?.groundingChunks as GroundingChunk[]
        };

      } catch (error: any) {
        lastError = error;
        const isRateLimit = error.message?.includes("429") || error.message?.includes("QUOTA");
        
        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          const waitTime = INITIAL_BACKOFF * Math.pow(2, attempt);
          if (onRetry) onRetry(Math.ceil(waitTime / 1000));
          await this.sleep(waitTime);
          continue;
        }
        break;
      }
    }

    throw lastError;
  }
}

export const geminiService = new GeminiService();
