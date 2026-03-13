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
  imageType: '人物' | '人脸' | '全身' | '场景';
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
  notice?: string;
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
  webhook: {
    enabled: boolean;
    url: string;
    secret: string;
    retryCount: number;
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
  concurrency?: number;
}

export interface PromptSegmentItem {
  index: number;
  content: string;
  characters: CharacterRef[];
}

export interface BatchSplitResult {
  total: number;
  segments: PromptSegmentItem[];
}

export interface BatchBindingMode {
  mode: 'individual' | 'global';
}

export interface SceneBinding {
  sceneIndex: number;
  sceneContent: string;
  characters: {
    name: string;
    binding?: CharacterBinding;
  }[];
}

export interface BatchGenerateConfig {
  delimiter: string;
  autoDetect: boolean;
  bindingMode: 'individual' | 'global';
  generateMode: 'sequential' | 'parallel';
  failStrategy: 'continue' | 'stop';
}

export interface BatchGenerateProgress {
  total: number;
  current: number;
  sceneResults: {
    index: number;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    result?: ImageGenerationResult;
  }[];
}

export interface GenerationHistory {
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationHistoryList {
  total: number;
  items: GenerationHistory[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  group: string;
  is_favorite: boolean;
  is_builtin: boolean;
  variables: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// US-26: Intelligent Reference Library Organization

export interface ImageFeature {
  hash: string;
  avg_color: string;
  width: number;
  height: number;
  file_size: number;
  extracted_at: string;
}

export interface DuplicateCandidate {
  id: string;
  source_binding_id: string;
  target_binding_id: string;
  source_image_path: string;
  target_image_path: string;
  similarity: number;
  confidence: 'high' | 'medium' | 'low';
  match_reasons: string[];
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason: string;
  applicable_binding_ids: string[];
}

export interface OrganizationSuggestion {
  id: string;
  type: 'duplicate' | 'tag_suggestion' | 'merge_candidate';
  title: string;
  description: string;
  confidence: number;
  suggested_action: 'merge' | 'delete' | 'keep_both' | 'add_tag' | 'no_action';
  preview_data: {
    duplicate?: DuplicateCandidate;
    tag_suggestion?: TagSuggestion;
  };
  created_at: string;
  processed: boolean;
}

export interface OrganizationResult {
  success: boolean;
  suggestions: OrganizationSuggestion[];
  duplicates_found: number;
  tag_suggestions_count: number;
  processing_time_ms: number;
}

export interface BatchOperation {
  id: string;
  operation_type: 'merge' | 'delete' | 'add_tags' | 'remove_tags';
  target_binding_ids: string[];
  parameters: Record<string, unknown>;
  preview: {
    affected_count: number;
    will_delete: string[];
    will_merge: { source: string; target: string }[];
    will_add_tags: Record<string, string[]>;
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  executed_at?: string;
}

export interface OperationLog {
  id: string;
  operation_type: string;
  target_binding_ids: string[];
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  can_undo: boolean;
  created_at: string;
  undone_at?: string;
}

export interface UndoResult {
  success: boolean;
  restored_count: number;
  message: string;
}
