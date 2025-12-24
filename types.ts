
export interface Scene {
  scene_number: number;
  duration_estimate: string;
  visual_hook: string;
  viral_score: number;
  rationale: string;
  audio_mood: string;
  sfx_cue: string;
  prompt: string;
  generatedImage?: string;
  isGeneratingImage?: boolean;
  isEnhancingPrompt?: boolean;
  error?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  icon: string;
  gender: 'male' | 'female';
}

export type AspectRatio = '9:16' | '16:9' | '1:1';

export enum AppStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  PRODUCING = 'producing',
  ERROR = 'error'
}
