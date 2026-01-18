import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings } from "../types";
import { MODELS } from "../constants";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<string> {
    // ALWAYS initialize right before usage with the named parameter as required.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const modelName = settings.quality === 'pro' ? MODELS.pro : MODELS.flash;
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const creativeDirective = settings.creativeContext 
      ? `[ATMOSPHERE & STYLE OVERRIDE: ${settings.creativeContext}]`
      : "[STYLE: Maintain original image style and lighting perfectly]";

    const textPart = {
      text: `[SYSTEM: SPATIAL_TRANSFORMATION_ENGINE_V3]
      Transformation Command: ${cameraPrompt}
      ${creativeDirective}
      
      TECHNICAL CONSTRAINTS:
      1. GEOMETRY: Preserve primary subject identity.
      2. PERSPECTIVE: Recalculate vanishing points for new orientation.
      3. LIGHTING: Ensure shadows align with spatial coordinates.
      4. SEED: ${settings.seed}
      
      OUTPUT: High-resolution cinematic result.`
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

    // Explicitly type the result to satisfy TS
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, textPart] },
      config
    });

    let imageUrl = '';
    const candidate = response.candidates?.[0];
    
    if (candidate?.content?.parts) {
      // Correct way to extract data: iterate all parts to find inlineData
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("CRITICAL_FAULT: Visual buffer reconstruction failed. Model returned no image data.");
    }

    return imageUrl;
  }
}

export const geminiService = new GeminiService();