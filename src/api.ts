import axios, { AxiosError } from 'axios';
import type {
  ParsedPrompt,
  CharacterBinding,
  ImageGenerationParams,
  ImageGenerationResult,
  APIConfig,
  GenerationConfig,
} from './types';

const API_BASE = '';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

async function fetchApi<T>(endpoint: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isGet = !body;
  try {
    const response = isGet
      ? await axios.get(url, {
        headers: {
          Accept: 'application/json',
        },
      })
      : await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      throw new Error(
        `API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`
      );
    } else if (axiosError.request) {
      throw new Error(`API Error: Network Error - ${axiosError.message}`);
    }
    throw error;
  }
}

export async function parsePrompt(prompt: string): Promise<ParsedPrompt> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<ParsedPrompt>('parse_prompt', { prompt });
  }
  return fetchApi<ParsedPrompt>('/api/parse', { prompt });
}

export async function getBindingsForPrompt(characters: string[]): Promise<CharacterBinding[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding[]>('get_bindings_for_prompt', { characters });
    return res.map(normalizeCharacterBinding);
  }
  const res = await fetchApi<CharacterBinding[]>('/api/bindings/for-prompt', {
    characters: characters.join(','),
  });
  return res.map(normalizeCharacterBinding);
}

export async function getAllBindings(): Promise<CharacterBinding[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding[]>('get_all_bindings');
    return res.map(normalizeCharacterBinding);
  }
  const res = await fetchApi<CharacterBinding[]>('/api/bindings');
  return res.map(normalizeCharacterBinding);
}

export async function saveReferenceImage(
  characterName: string,
  imageData: string,
  imageType: string
): Promise<CharacterBinding> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding>('save_reference_image', {
      characterName,
      imageData,
      imageType,
    });
    return normalizeCharacterBinding(res);
  }
  const res = await fetchApi<CharacterBinding>('/api/save-image', {
    characterName,
    imageData,
    imageType,
  });
  return normalizeCharacterBinding(res);
}

export async function bindCharacterReference(
  characterName: string,
  referenceImagePath: string,
  imageType: string
): Promise<CharacterBinding> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding>('bind_character_reference', {
      characterName,
      referenceImagePath,
      imageType,
    });
    return normalizeCharacterBinding(res);
  }
  const res = await fetchApi<CharacterBinding>('/api/bind', {
    characterName,
    referenceImagePath,
    imageType,
  });
  return normalizeCharacterBinding(res);
}

export async function unbindCharacter(characterName: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('unbind_character', { characterName });
  }
  return fetchApi<boolean>('/api/unbind', { characterName });
}

export async function generateImage(params: ImageGenerationParams): Promise<ImageGenerationResult> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<ImageGenerationResult>('generate_image', { params });
  }

  const body = {
    model: params.model,
    prompt: params.prompt,
    character_bindings: params.characterBindings?.map(b => ({
      character_name: b.character_name,
      reference_image_path: b.reference_image_path,
      image_type: b.image_type,
    })),
    width: params.width,
    height: params.height,
    count: params.count,
    quality: params.quality,
    size: params.size,
    sequential_image_generation: params.sequential_image_generation,
    response_format: params.response_format,
    watermark: params.watermark,
    images: params.images,
  };

  return fetchApi<ImageGenerationResult>('/api/generate', body);
}

export async function saveApiConfig(config: APIConfig): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('save_api_config', { config });
  }
  return fetchApi<boolean>('/api/config/save', {
    seedream: {
      baseUrl: config.seedream.baseUrl,
      apiKey: config.seedream.apiKey,
    },
    bananaPro: {
      baseUrl: config.bananaPro.baseUrl,
      apiKey: config.bananaPro.apiKey,
    },
  });
}

export async function getDefaultApiConfig(): Promise<APIConfig> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<APIConfig>('get_default_api_config');
  }
  const result = await fetchApi<{
    seedream: { baseUrl: string; apiKey: string };
    bananaPro: { baseUrl: string; apiKey: string };
  }>('/api/config/default');
  return {
    seedream: result.seedream,
    bananaPro: result.bananaPro,
  };
}

export async function testApiConnection(
  model: 'seedream' | 'banana_pro',
  baseUrl?: string,
  apiKey?: string
): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('test_api_connection', { model, baseUrl, apiKey });
  }
  return fetchApi<boolean>('/api/test-connection', { model, baseUrl, apiKey });
}

export async function saveGenerationConfig(config: GenerationConfig): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('save_generation_config', { config });
  }
  return fetchApi<boolean>('/api/generation-config/save', config);
}

export async function loadGenerationConfig(): Promise<GenerationConfig> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<GenerationConfig>('load_generation_config');
  }
  return fetchApi<GenerationConfig>('/api/generation-config/load');
}

export function getImageUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const cleanPath = path.replace(/^file:\/\//, '');
  return `${API_BASE}/api/image?path=${encodeURIComponent(cleanPath)}`;
}

function normalizeCharacterBinding(b: any): CharacterBinding {
  if (!b) return b;
  return {
    characterName: b.characterName || b.character_name,
    referenceImagePath: b.referenceImagePath || b.reference_image_path,
    imageType: b.imageType || b.image_type,
    createdAt: b.createdAt || b.created_at,
    bound: b.bound !== undefined ? b.bound : true,
  };
}
