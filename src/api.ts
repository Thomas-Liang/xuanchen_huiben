import axios, { AxiosError } from 'axios';
import type {
  ParsedPrompt,
  CharacterBinding,
  ImageGenerationParams,
  ImageGenerationResult,
  APIConfig,
  GenerationConfig,
  BatchSplitResult,
} from './types';

const API_BASE = '';

function isTauri(): boolean {
  // For debugging - always use Tauri commands in desktop app
  const result = typeof window !== 'undefined' && '__TAURI__' in (window as any);
  console.log('[api.ts] isTauri check:', result, 'window.__TAURI__:', (window as any).__TAURI__);
  return true; // Always use Tauri commands for now
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
      : await axios.post(url, JSON.stringify(body), {
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
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

export async function batchSplitPrompt(
  prompt: string,
  delimiter: string,
  autoDetect: boolean
): Promise<BatchSplitResult> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<BatchSplitResult>('batch_split_prompt', { prompt, delimiter, autoDetect });
  }
  return fetchApi<BatchSplitResult>('/api/batch-split', { prompt, delimiter, autoDetect });
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
    const rustParams = {
      model: params.model,
      prompt: params.prompt,
      character_bindings: (params.characterBindings || []).map(b => ({
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
    return invoke<ImageGenerationResult>('generate_image', { params: rustParams });
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

export async function loadApiConfig(): Promise<APIConfig> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const config = await invoke<{
      seedream: { base_url: string; api_key: string };
      banana_pro: { base_url: string; api_key: string };
    }>('load_api_config');
    return {
      seedream: { baseUrl: config.seedream.base_url, apiKey: config.seedream.api_key },
      bananaPro: { baseUrl: config.banana_pro.base_url, apiKey: config.banana_pro.api_key },
    };
  }
  const result = await fetchApi<{
    seedream: { baseUrl: string; apiKey: string };
    bananaPro: { baseUrl: string; apiKey: string };
  }>('/api/config/load');
  return {
    seedream: result.seedream,
    bananaPro: result.bananaPro,
  };
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
  if (!path || path.trim() === '') return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;

  let cleanPath = path.replace(/^file:\/\//, '').replace(/^file:/, '');
  cleanPath = cleanPath.replace(/\//g, '\\');

  if (isTauri()) {
    return `http://127.0.0.1:8888/api/image?path=${encodeURIComponent(cleanPath)}`;
  }
  return `${API_BASE}/api/image?path=${encodeURIComponent(cleanPath)}`;
}

export async function saveImageToFile(imageUrl: string, filePath: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('save_image_to_file', { imageUrl, filePath });
  }
  throw new Error('Save image only supported in Tauri app');
}

export async function saveImageDialog(imageUrl: string): Promise<string | null> {
  // Always try Tauri dialog first
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');

    // Generate default filename
    const defaultName = `image_${Date.now()}.png`;

    const filePath = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });

    if (filePath) {
      await invoke('save_image_to_file', { imageUrl, filePath });
      return filePath;
    }
    return null;
  } catch (e) {
    // If Tauri is not available, use web fallback
    console.log('Using web fallback for save dialog');
  }

  // Web fallback: Use Blob to bypass cross-origin restrictions on 'download' attribute
  try {
    let blob: Blob;

    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: mimeString });
    } else {
      const response = await fetch(imageUrl);
      blob = await response.blob();
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;

    // Determine filename
    let fileName = `ai-gen-${Date.now()}.png`;
    if (imageUrl.startsWith('data:')) {
      const extension = imageUrl.split(';')[0].split('/')[1] || 'png';
      fileName = `ai-gen-${Date.now()}.${extension}`;
    } else {
      try {
        const url = new URL(imageUrl);
        const parts = url.pathname.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.includes('.')) {
          fileName = lastPart;
        }
      } catch (e) {}
    }

    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

    return '已开始下载';
  } catch (error) {
    console.error('Web download failed:', error);
    // If blob fetch fails (e.g. CORS), try direct link as last resort
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank';
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return '尝试直接打开下载';
  }
}

function normalizeCharacterBinding(b: any): CharacterBinding {
  if (!b) return b;
  return {
    characterName: b.characterName || b.character_name,
    referenceImagePath: b.referenceImagePath || b.reference_image_path,
    imageType: b.imageType || b.image_type,
    createdAt: b.createdAt || b.created_at,
    bound: b.bound !== undefined ? b.bound : true,
    tags: b.tags || [],
  };
}

export interface ReferenceImageQuery {
  image_type?: string;
  search?: string;
  tags?: string[];
}

export async function getReferenceImages(query?: ReferenceImageQuery): Promise<CharacterBinding[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding[]>('get_reference_images', { query });
    return res.map(normalizeCharacterBinding);
  }
  const params = new URLSearchParams();
  if (query?.image_type) params.append('image_type', query.image_type);
  if (query?.search) params.append('search', query.search);
  if (query?.tags) params.append('tags', query.tags.join(','));
  const res = await fetchApi<CharacterBinding[]>(`/api/reference-images?${params.toString()}`);
  return res.map(normalizeCharacterBinding);
}

export async function searchReferenceImages(keyword: string): Promise<CharacterBinding[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding[]>('search_reference_images', { keyword });
    return res.map(normalizeCharacterBinding);
  }
  const res = await fetchApi<CharacterBinding[]>('/api/reference-images/search', {
    keyword,
  });
  return res.map(normalizeCharacterBinding);
}

export async function addTagToReference(characterName: string, tag: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('add_tag_to_reference', { characterName, tag });
  }
  return fetchApi<boolean>('/api/reference-images/add-tag', { characterName, tag });
}

export async function removeTagFromReference(characterName: string, tag: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('remove_tag_from_reference', { characterName, tag });
  }
  return fetchApi<boolean>('/api/reference-images/remove-tag', { characterName, tag });
}

export async function getAllTags(): Promise<string[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string[]>('get_all_tags');
  }
  return fetchApi<string[]>('/api/reference-images/tags');
}

export async function getReferencesByType(imageType: string): Promise<CharacterBinding[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const res = await invoke<CharacterBinding[]>('get_references_by_type', { imageType });
    return res.map(normalizeCharacterBinding);
  }
  const res = await fetchApi<CharacterBinding[]>('/api/reference-images/by-type', {
    imageType,
  });
  return res.map(normalizeCharacterBinding);
}

export async function deleteReferenceImage(characterName: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<boolean>('delete_reference_image', { characterName });
  }
  return fetchApi<boolean>('/api/reference-images/delete', { characterName });
}

// ==================== History API ====================

export async function addHistory(history: {
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  created_at: string;
  updated_at: string;
}): Promise<{
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  created_at: string;
  updated_at: string;
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('add_history', { history });
  }
  return fetchApi('/api/history/add', history);
}

export async function getHistory(
  page: number = 0,
  pageSize: number = 20
): Promise<{
  total: number;
  items: {
    id: string;
    prompt: string;
    model: string;
    params: Record<string, unknown>;
    images: string[];
    characters: string[];
    status: string;
    created_at: string;
    updated_at: string;
  }[];
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_history', { page, pageSize });
  }
  return fetchApi('/api/history/list', { page, pageSize });
}

export async function getHistoryById(id: string): Promise<{
  id: string;
  prompt: string;
  model: string;
  params: Record<string, unknown>;
  images: string[];
  characters: string[];
  status: string;
  created_at: string;
  updated_at: string;
} | null> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_history_by_id', { id });
  }
  return fetchApi('/api/history/get', { id });
}

export async function deleteHistory(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_history', { id });
  }
  return fetchApi('/api/history/delete', { id });
}

export async function clearHistory(): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('clear_history');
  }
  return fetchApi('/api/history/clear', {});
}
