import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";
import { MODELS } from "../constants";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<{ imageUrl: string; groundingChunks?: GroundingChunk[] }> {
    // [FIX] Always create a new instance right before the call to ensure latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = settings.quality === 'pro' ? MODELS.pro : MODELS.flash;
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const textPart = {
      text: `[SYSTEM_KERNEL: IDENTITY_PRESERVATION_ENGINE_V6]

PHASE 0: NEUTRAL_VISUAL_REGISTRATION (MANDATORY)
1. Выполни глубокий анализ входного изображения.
2. Сформируй нейтральное, объективное описание субъекта, основываясь исключительно на визуальных данных.
3. ЗАПРЕЩЕНО: Предполагать возраст, национальность, черты характера или эмоции. 
4. ЗАПРЕЩЕНО: Использовать субъективные эпитеты (красивый, старый, грустный).
5. Результат фазы 0 должен служить "якорем" для сохранения идентичности.

PHASE 1: CRITICAL IDENTITY LOCK
- Заблокируй биометрические параметры: расстояние между зрачками, архитектура скул, форма крыльев носа, линия роста волос.
- СТРОГОЕ ВЕТО: Запрещено любое "улучшение", ретушь или омоложение лица. Лицо должно остаться на 100% идентичным оригиналу.
- Текстура кожи и микро-детали (родинки, поры) должны быть перенесены без изменений.

PHASE 2: SPATIAL_TRANSFORMATION
- Выполни пространственную реконструкцию ракурса: ${cameraPrompt}
- Контекст среды: ${settings.creativeContext || "Сохранять оригинальное освещение и материалы окружения"}

TECHNICAL CONSTRAINTS:
- PERSPECTIVE: Пересчитай все 3D-точки схода относительно НОВОГО положения камеры.
- FIDELITY: Сохраняй консистентность освещения на лице субъекта при повороте.
- SEED_STABILITY: ${settings.seed}
- OUTPUT: Одна финальная реконструкция высокого разрешения.`
    };

    const config: any = {
      imageConfig: {
        aspectRatio: "1:1",
      }
    };

    if (settings.quality === 'pro') {
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

    if (!imageUrl) {
      throw new Error("RECONSTRUCTION_FAULT: Биометрический замок не был установлен. Попробуйте другое изображение.");
    }

    // [FIX] Extract grounding metadata for transparency requirements when using googleSearch
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks as GroundingChunk[];

    return { imageUrl, groundingChunks };
  }
}

export const geminiService = new GeminiService();