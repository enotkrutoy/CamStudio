import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings } from "../types";
import { MODELS } from "../constants";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<string> {
    // ALWAYS initialize right before usage as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

    // Support for higher resolutions and grounding tools if Pro model is selected
    if (settings.quality === 'pro') {
      config.imageConfig.imageSize = settings.imageSize || '1K';
      // Enable Google Search grounding for the highest quality Pro output
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
      // Iterate through all parts to find the image part as instructed.
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error("CRITICAL_FAULT: Visual buffer reconstruction failed. Check API balance or constraints.");
    return imageUrl;
  }
}

export const geminiService = new GeminiService();