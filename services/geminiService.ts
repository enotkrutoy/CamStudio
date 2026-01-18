
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";
import { MODELS } from "../constants";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<{ imageUrl: string; groundingChunks?: GroundingChunk[] }> {
    // [FIX] Always create a new instance to ensure we use latest env key or selected key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // According to instructions: 
    // gemini flash: 'gemini-2.5-flash-image'
    // nano banana 2: 'gemini-3-pro-image-preview'
    const modelName = settings.quality === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const textPart = {
      text: `[SYSTEM_KERNEL: IDENTITY_PRESERVATION_V7]
OBJECTIVE: Reconstruct image from a new camera perspective while maintaining 100% biometric fidelity.

PHASE 1: BIO-METRIC LOCK
- Lock all primary features: interpupillary distance, facial bone structure, skin micro-texture.
- No beautification. No alterations to age or ethnicity.

PHASE 2: CAMERA RECONSTRUCTION
- New Perspective Command: ${cameraPrompt}
- Environment: ${settings.creativeContext || "Maintain original materials and lighting consistency."}

CONSTRAINTS:
- Render high-fidelity perspective shifts.
- Recalculate shadows and reflections based on new orientation.
- Seed: ${settings.seed}`
    };

    const config: any = {
      imageConfig: {
        aspectRatio: "1:1",
      }
    };

    if (settings.quality === 'pro') {
      config.imageConfig.imageSize = settings.imageSize || '1K';
      // Search grounding is only for pro image models
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

      if (!imageUrl) {
        throw new Error("RECONSTRUCTION_FAULT: Model failed to generate pixel data. Check your image source.");
      }

      const groundingChunks = candidate?.groundingMetadata?.groundingChunks as GroundingChunk[];

      return { imageUrl, groundingChunks };
    } catch (error: any) {
      // Re-throw with more context if it's a known quota error
      if (error.status === 429 || error.message?.includes("429")) {
        throw new Error("QUOTA_EXCEEDED: Бесплатные лимиты исчерпаны. Подождите минуту.");
      }
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
