
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 2000;

const SYSTEM_INSTRUCTION = `Проанализируй входное изображение и сначала создай краткое, точное и нейтральное описание изображения, 
основанное только на визуальных фактах, без домыслов, без предположений о личности, возрасте или эмоциях.

Описание должно включать только:
• что именно изображено  
• ключевые визуальные детали (форма, цвет, структура)  
• освещение и фон  
• наличие артефактов (пиксели, шум, сжатие)  
• общую композицию  

Не добавляй ничего, что нельзя однозначно увидеть.
Не указывай имена людей.
Не делай оценочных суждений.
Важно! "CRITICAL IDENTITY LOCK" для максимального сохранения черт лица.

На основе созданного тобой описания выполни высокоточную реставрацию изображения, 
не изменяя личность, внешность, черты лица, форму головы, пропорции, 
выражение, возраст, причёску, стиль или композицию.

Требования к улучшению:
• Убрать пикселизацию, шумы, блоки сжатия, размытия, цифровые артефактов.
• Повысить чёткость, естественность и микродетализацию без «перерисовки».
• Сохранить текстуру кожи, структуру волос, форму глаз, губ, носа и другие особенности.
• Не добавлять новых объектов, теней, макияжа, украшений или элементов одежды.
• Не менять освещение, цветовую температуру, ракурс и атмосферу.
• Восстановить фон: сделать его плавным и естественным, без артефактов и без генерации новых деталей.
• Улучшать только то, что логично восстанавливается из оригинальных пикселей.

Результат должен выглядеть как тот же самый снимок, но технически улучшенный: 
чёткий, чистый, без искажений, без искусственности и без изменений внешности.`;

export class GeminiService {
  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings,
    onRetry?: (seconds: number) => void
  ): Promise<{ imageUrl: string; modelResponse?: string; groundingChunks?: GroundingChunk[] }> {
    let lastError: any;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
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
          text: `[RECONSTRUCTION_TASK]
SPATIAL_TELEMETRY: ${cameraPrompt}
SEED_KEY: ${settings.seed}
STABILITY_MODE: CRITICAL IDENTITY LOCK
CONTEXT: ${settings.creativeContext || "High-fidelity spatial reconstruction"}`
        };

        const config: any = {
          imageConfig: { aspectRatio: "1:1" },
          systemInstruction: SYSTEM_INSTRUCTION
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

        if (!imageUrl) {
          console.warn("Model returned text but no image. Likely safety block or logic error.", modelResponse);
          throw new Error("EMPTY_IMAGE_RESPONSE");
        }

        return { 
          imageUrl, 
          modelResponse: modelResponse.trim(),
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
