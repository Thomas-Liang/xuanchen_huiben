export interface PromptSegment {
  type: 'scene' | 'character' | 'action' | 'background' | 'other';
  content: string;
  start_index: number;
  end_index: number;
}

export interface ParsedPrompt {
  original: string;
  segments: PromptSegment[];
  characters: CharacterRef[];
}

export interface CharacterRef {
  name: string;
  reference_image?: string;
  bound: boolean;
}

export interface CharacterBinding {
  characterName: string;
  referenceImagePath: string;
  imageType: '人物' | '场景';
  createdAt: string;
}

export interface ImageGenerationParams {
  model: 'jimeng' | 'banana_pro';
  prompt: string;
  segments: PromptSegment[];
  characterBindings: CharacterBinding[];
  width: number;
  height: number;
  count: number;
  quality: 'standard' | 'high' | 'ultra';
}

export interface ImageGenerationResult {
  success: boolean;
  images: string[];
  error?: string;
  taskId?: string;
}

export interface APIConfig {
  jimeng: {
    baseUrl: string;
    apiKey: string;
  };
  bananaPro: {
    baseUrl: string;
    apiKey: string;
  };
}

export interface GenerationProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}
