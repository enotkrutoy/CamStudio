
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
    
    // According to instructions: 
    // Free Mode (flash): 'gemini-2.5-flash-image'
    // Pro Mode: 'gemini-3-pro-image-preview'
    const modelName = settings.quality === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const textPart = {
      text: `[RECONSTRUCTION_KERNEL_V9]
TRANSFORM: Generate new perspective from source.
VIEWPORT_COMMAND: ${cameraPrompt}
SEED_CONTROL: ${settings.seed}
FIDELITY_MODE: IDENTITY_LOCK_ON

CRITICAL: Maintain original person/object identity perfectly. No distortions.`
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

      if (!imageUrl) throw new Error("EMPTY_PIXEL_DATA");

      return { 
        imageUrl, 
        groundingChunks: candidate?.groundingMetadata?.groundingChunks as GroundingChunk[] 
      };
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Better error messaging for Free Tier users
      if (error.message?.includes("429") || error.message?.includes("QUOTA")) {
        throw new Error("QUOTA_LIMIT: Лимит бесплатного уровня исчерпан. Подождите минуту.");
      }
      
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
