
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ImageData, GenerationSettings, GroundingChunk } from "../types";

export class GeminiService {
  async generateImage(
    sourceImage: ImageData,
    cameraPrompt: string,
    settings: GenerationSettings
  ): Promise<{ imageUrl: string; groundingChunks?: GroundingChunk[] }> {
    // Create fresh instance to ensure we use the latest injected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isPro = settings.quality === 'pro';
    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const imagePart = {
      inlineData: {
        mimeType: sourceImage.mimeType,
        data: sourceImage.base64.split(',')[1],
      },
    };

    const creativeDirective = settings.creativeContext 
      ? `CREATIVE_CONTEXT: ${settings.creativeContext}`
      : "CREATIVE_CONTEXT: Preserve original scene atmosphere.";

    const textPart = {
      text: `[SPATIAL_RECONSTRUCTION_KERNEL_V12]
TRANSFORM_PROTOCOL: GENERATE_NEW_PERSPECTIVE
VIEWPORT_MATRIX: ${cameraPrompt}
${creativeDirective}
SEED_CONTROL: ${settings.seed}
STABILITY_MODE: IDENTITY_LOCK_ULTRA_PRECISE

CORE_ENGINE_DIRECTIVES: 
1. IDENTITY_PRESERVATION: The primary subject must remain identical in features, clothing, and proportions to the source.
2. PARALLAX_CALCULATION: Shift background elements realistically based on the ${cameraPrompt} command.
3. LIGHTING_COHERENCE: Recalculate shadows and highlights to match the new camera vector.
4. ENVIRONMENT_SYNTHESIS: Fill in occluded areas with logical architectural or natural continuity.`
    };

    const config: any = {
      imageConfig: {
        aspectRatio: "1:1",
      }
    };

    if (isPro) {
      config.imageConfig.imageSize = settings.imageSize || '1K';
      // Pro model supports Search Grounding for real-time fidelity
      config.tools = [{ googleSearch: {} }];
    } else if (settings.location) {
      // 2.5 series models support Maps Grounding
      config.tools = [{ googleMaps: {} }];
      config.toolConfig = {
        retrievalConfig: {
          latLng: settings.location
        }
      };
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

      if (!imageUrl) throw new Error("RENDER_ENGINE_FAULT: Failed to synthesize perspective stream.");

      // Extract and normalize grounding chunks
      const chunks = candidate?.groundingMetadata?.groundingChunks as GroundingChunk[];

      return { 
        imageUrl, 
        groundingChunks: chunks
      };
    } catch (error: any) {
      console.error("Gemini API Spatial Error:", error);
      
      if (error.message?.includes("429") || error.message?.includes("QUOTA")) {
        throw new Error("QUOTA_LIMIT: Spatial processing units exhausted. Please hold for 60s.");
      }
      
      if (error.message?.includes("Requested entity was not found")) {
        throw new Error("AUTH_ERROR: Identity context lost. Please re-authenticate your API session.");
      }
      
      throw error;
    }
  }
}

export const geminiService = new GeminiService();