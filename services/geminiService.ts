
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<{ imageUrl: string; groundingChunks?: GroundingChunk[] }> {
    // [FIX] Always create a fresh instance to use latest API key (process.env or user selected)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const modelName = settings.quality === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const textPart = {
      text: `[RECONSTRUCTION_KERNEL_V11]
TRANSFORM: Generate a high-fidelity new perspective from the source image.
VIEWPORT_COMMAND: ${cameraPrompt}
SEED_CONTROL: ${settings.seed}
STABILITY_MODE: IDENTITY_LOCK_ULTRA

CORE_DIRECTIVE: 
1. Maintain the exact likeness and identity of the subject from the source image.
2. Adjust lighting, shadows, and parallax to match the new camera position.
3. Ensure the environment looks consistent with the perspective shift.`
    };

    const config: any = {
      imageConfig: {
        aspectRatio: "1:1",
      }
    };

    if (settings.quality === 'pro') {
      config.imageConfig.imageSize = settings.imageSize || '1K';
      // High-quality mode allows Google Search for context
      config.tools = [{ googleSearch: {} }];
    }

    try {
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

      if (!imageUrl) throw new Error("ENGINE_FAULT: Failed to decode pixel stream.");

      const chunks = candidate?.groundingMetadata?.groundingChunks as GroundingChunk[];

      return { 
        imageUrl, 
        groundingChunks: chunks
      };
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Handle Quota
      if (error.message?.includes("429") || error.message?.includes("QUOTA")) {
        throw new Error("QUOTA_LIMIT: Лимит бесплатных запросов исчерпан. Пожалуйста, подождите 60 секунд.");
      }
      
      // Handle Missing Project (API Key Error)
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("AUTH_ERROR: Выбранный проект или ключ не найден. Пожалуйста, переподключите API-ключ.");
      }
      
      throw error;
    }
  }
}

export const geminiService = new GeminiService();