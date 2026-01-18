
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

const MAX_RETRIES = 2;
const INITIAL_BACKOFF = 2000;

const SYSTEM_INSTRUCTION = `Вы — высокоточный движок пространственного интеллекта. Ваша задача: выполнить техническую реконструкцию исходного изображения на основе предоставленной телеметрии камеры.

ПРАВИЛА ОБРАБОТКИ:
1. Описание (RU): Сначала предоставьте краткий технический анализ новой геометрии сцены, освещения и перспективы.
2. Синтез: Создайте НОВОЕ изображение, точно соответствующее перемещению камеры.
3. IDENTITY LOCK: Запрещено изменять костную структуру лица, цвет глаз или этническую принадлежность. Личность должна быть 100% узнаваема.
4. ОПТИКА: Имитируйте физические свойства линз (дисторсия краев для 14mm, сжатие планов для 85mm).
5. КАЧЕСТВО: Устраните шумы, восстановите микро-текстуры кожи и волос.
6. Выходное изображение должно быть строго 1:1.`;

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
    
    // Create fresh instance to pick up latest API key
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
          text: `[RECONSTRUCTION_TASK]
TELEMETRY: ${cameraPrompt}
ENGINE_SEED: ${settings.seed}
ENVIRONMENT_BIAS: ${settings.creativeContext || "Cinematic Studio Lighting"}
OUTPUT_MODE: HIGH_FIDELITY_SPATIAL_SYNC`
        };

        const config: any = {
          imageConfig: { 
            aspectRatio: "1:1",
            imageSize: isPro ? (settings.imageSize || '1K') : undefined
          },
          systemInstruction: SYSTEM_INSTRUCTION
        };

        // Google Search is only available for Gemini 3 Pro
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
        
        // Handle rate limits with backoff
        const isRateLimit = msg.includes("429") || msg.includes("quota");
        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          const waitTime = INITIAL_BACKOFF * (attempt + 1);
          if (onRetry) onRetry(Math.ceil(waitTime / 1000));
          await this.sleep(waitTime);
          continue;
        }

        // Special handling for Key errors to trigger re-selection in App component
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
