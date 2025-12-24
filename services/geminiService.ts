
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, AspectRatio } from "../types";
import { NEGATIVE_CONSTRAINTS } from "../constants";

// The Google GenAI SDK can be used to call Gemini models.
// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

export const analyzeScript = async (script: string, styleContext: string): Promise<Scene[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
    ACT AS: The "Visual Production Engine" - Director Mode.
    TASK: Analyze the provided Voiceover Script.
    CRITICAL SEGMENTATION RULE: Break script into 5-10s scenes.
    STYLE CONTEXT: ${styleContext || 'Default Cinematic'}
    
    RULES:
    1. Break the script into meaningful visual units.
    2. Provide a 'visual_hook' that grabs attention in the first 3 seconds.
    3. Generate a highly detailed 'prompt' for an image model.
    4. Calculate a 'viral_score' (1-100) based on trend potential.
    5. Adhere to negative constraints: ${NEGATIVE_CONSTRAINTS}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: script,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                scene_number: { type: Type.INTEGER },
                duration_estimate: { type: Type.STRING },
                visual_hook: { type: Type.STRING },
                viral_score: { type: Type.INTEGER },
                rationale: { type: Type.STRING },
                audio_mood: { type: Type.STRING },
                sfx_cue: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ["scene_number", "duration_estimate", "visual_hook", "viral_score", "rationale", "audio_mood", "sfx_cue", "prompt"]
            }
          }
        },
        required: ["scenes"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  return data.scenes || [];
};

export const refineScript = async (currentScript: string, instructions: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
    ACT AS: Expert Script Writer and Viral Content Strategist.
    TASK: Refine the provided script based on specific user instructions.
    
    GUIDELINES:
    1. Maintain the core message but optimize for retention, impact, and flow.
    2. Incorporate the user's specific feedback: "${instructions}".
    3. Ensure the tone is consistent and professional.
    4. Output ONLY the refined script text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Current Script: "${currentScript}"\n\nInstructions: "${instructions}"`,
    config: { systemInstruction }
  });

  return response.text?.trim() || currentScript;
};

export const enhancePrompt = async (currentPrompt: string, styleContext: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `
    ACT AS: Expert Visual Prompt Engineer for high-end AI Image Generators.
    TASK: Rewrite the user's basic prompt into a professional, cinematic, and detailed visual masterpiece.
    
    GUIDELINES:
    1. Inject technical details: camera angles (low angle, close up), lighting (volumetric, rim lighting, golden hour), and texture (hyper-realistic, 8k, Unreal Engine 5).
    2. Incorporate the Style Context: ${styleContext || 'Cinematic Photorealism'}.
    3. Keep it punchy but descriptive.
    4. Output ONLY the enhanced prompt text, no preamble.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Enhance this prompt: "${currentPrompt}"`,
    config: { systemInstruction }
  });

  return response.text?.trim() || currentPrompt;
};

export const extractStyle = async (base64Image: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: "STRICT ANALYSIS: Examine this image and identify: 1. Dominant color palette (specific shades). 2. Lighting techniques (e.g., chiaroscuro, bokeh, volumetric light). 3. Artistic medium (e.g., macro photography, digital oil painting, 3D render). 4. Mood and texture. Return 20 precise descriptive keywords for prompt engineering, ignoring subject matter." },
        { inlineData: { data: base64Image, mimeType } }
      ]
    }
  });
  return response.text || "";
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `${prompt}. Cinematic, high fidelity, professional grade.` }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      }
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!imagePart || !imagePart.inlineData) throw new Error("No image generated");
  
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const generateThumbnail = async (images: string[], prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = images.map(img => {
    const base64Data = img.replace(/^data:image\/(png|jpeg);base64,/, "");
    return {
      inlineData: {
        data: base64Data,
        mimeType: 'image/png'
      }
    };
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { 
      parts: [
        ...imageParts,
        { text: `ACT AS: Viral Marketing Visual Specialist.
          TASK: Create a HIGH-CLICK-THROUGH-RATE YouTube Thumbnail.
          BLEND: Incorporate and blend elements from the provided ${images.length} scenes into a single, cohesive, dramatic composition.
          INSTRUCTIONS: ${prompt || "Focus on the most impactful visuals. Add cinematic depth, vibrant highlights, and create a sense of intrigue. Professional 4k quality."}` 
        }
      ] 
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      }
    }
  });

  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (!imagePart || !imagePart.inlineData) throw new Error("Thumbnail generation failed");
  
  return `data:image/png;base64,${imagePart.inlineData.data}`;
};

export const generateTTS = async (text: string, voiceName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS generation failed");
  
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const wavHeader = createWavHeader(bytes.length, 24000);
  const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
};

const createWavHeader = (dataLength: number, sampleRate: number) => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  return header;
};
