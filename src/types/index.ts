export interface PromptSegment {
  type: 'scene' | 'character' | 'action' | 'background' | 'time' | 'weather' | 'style' | 'other';
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
  referenceImagePath?: string;
  imageType: '人物' | '场景';
  createdAt: string;
  bound: boolean;
  tags?: string[];
}

export interface CharacterBindingInfo {
  character_name: string;
  reference_image_path?: string;
  image_type: string;
}

export interface CharacterBindingResult {
  success: boolean;
  binding?: CharacterBinding;
  error?: string;
}

export interface ImageGenerationParams {
  model: 'seedream' | 'banana_pro';
  prompt: string;
  characterBindings: CharacterBindingInfo[];
  width: number;
  height: number;
  count: number;
  quality: 'standard' | 'high' | 'ultra';
  size?: string;
  sequential_image_generation?: 'auto' | 'disabled';
  response_format?: 'url' | 'b64_json';
  watermark?: boolean;
  images?: string[];
}

export interface ImageGenerationResult {
  success: boolean;
  images: string[];
  error?: string;
  taskId?: string;
}

export interface APIConfig {
  seedream: {
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

export interface GenerationConfig {
  model: 'seedream' | 'banana_pro';
  width: number;
  height: number;
  count: number;
  quality: 'standard' | 'high' | 'ultra';
  size?: string;
  sequential_image_generation?: 'auto' | 'disabled';
  response_format?: 'url' | 'b64_json';
  watermark?: boolean;
}
