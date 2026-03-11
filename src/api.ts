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
  if (typeof window === 'undefined') return false;
  const w = window as any;
  // Browser 中不应走 Tauri invoke 分支；仅桌面运行时返回 true
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__ || w.__TAURI_IPC__);
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
  if (isTauri()) {
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
      throw new Error(`Tauri保存失败: ${String(e)}`);
    }
  }

  // Web fallback: Use Blob to trigger browser download.
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
    throw new Error(`Web下载失败: ${String(error)}`);
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
  source_history_id?: string;
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
  source_history_id?: string;
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
  pageSize: number = 20,
  filter?: {
    model?: string;
    promptKeyword?: string;
    startDate?: string;
    endDate?: string;
    character?: string;
    widthMin?: number;
    widthMax?: number;
    heightMin?: number;
    heightMax?: number;
    quality?: string;
  }
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
    return invoke('get_history', {
      page,
      pageSize,
      page_size: pageSize,
      model: filter?.model || null,
      promptKeyword: filter?.promptKeyword || null,
      prompt_keyword: filter?.promptKeyword || null,
      startDate: filter?.startDate || null,
      start_date: filter?.startDate || null,
      endDate: filter?.endDate || null,
      end_date: filter?.endDate || null,
      character: filter?.character || null,
      widthMin: filter?.widthMin || null,
      widthMax: filter?.widthMax || null,
      heightMin: filter?.heightMin || null,
      heightMax: filter?.heightMax || null,
      quality: filter?.quality || null,
    });
  }
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (filter?.model) params.set('model', filter.model);
  if (filter?.promptKeyword) params.set('prompt_keyword', filter.promptKeyword);
  if (filter?.startDate) params.set('start_date', filter.startDate);
  if (filter?.endDate) params.set('end_date', filter.endDate);
  if (filter?.character) params.set('character', filter.character);
  if (filter?.widthMin) params.set('width_min', String(filter.widthMin));
  if (filter?.widthMax) params.set('width_max', String(filter.widthMax));
  if (filter?.heightMin) params.set('height_min', String(filter.heightMin));
  if (filter?.heightMax) params.set('height_max', String(filter.heightMax));
  if (filter?.quality) params.set('quality', filter.quality);
  return fetchApi(`/api/history/list?${params.toString()}`);
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

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export async function createFolder(name: string, parentId?: string): Promise<Folder> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('create_folder', { name, parentId: parentId || null });
  }
  return fetchApi('/api/folders/create', { name, parentId });
}

export async function renameFolder(id: string, newName: string): Promise<Folder> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('rename_folder', { id, newName });
  }
  return fetchApi('/api/folders/rename', { id, newName });
}

export async function deleteFolder(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_folder', { id });
  }
  return fetchApi('/api/folders/delete', { id });
}

export async function getFolders(parentId?: string): Promise<Folder[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_folders', { parentId: parentId || null });
  }
  return fetchApi('/api/folders/list', { parentId });
}

export async function getFolderTree(): Promise<Folder[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_folder_tree');
  }
  return fetchApi('/api/folders/tree');
}

export async function moveImageToFolder(
  characterName: string,
  folderId?: string
): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('move_image_to_folder', { characterName, folderId: folderId || null });
  }
  return fetchApi('/api/folders/move-image', { characterName, folderId });
}

export async function batchDeleteReferences(characterNames: string[]): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('batch_delete_references', { characterNames });
  }
  return fetchApi('/api/reference-images/batch-delete', { characterNames });
}

export async function batchMoveToFolder(
  characterNames: string[],
  folderId?: string
): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('batch_move_to_folder', { characterNames, folderId: folderId || null });
  }
  return fetchApi('/api/reference-images/batch-move', { characterNames, folderId });
}

export async function batchAddTags(characterNames: string[], tags: string[]): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('batch_add_tags', { characterNames, tags });
  }
  return fetchApi('/api/reference-images/batch-add-tags', { characterNames, tags });
}

// ==================== Prompt Template API (US-13, US-25) ====================

export async function addPromptTemplate(template: {
  name: string;
  content: string;
  category: string;
  group?: string;
  is_favorite?: boolean;
}): Promise<{
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
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('add_prompt_template', { template });
  }
  return fetchApi('/api/prompt-templates/add', template);
}

export async function getAllPromptTemplates(): Promise<
  {
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
  }[]
> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_all_prompt_templates');
  }
  return fetchApi('/api/prompt-templates/list');
}

export async function getPromptTemplateById(id: string): Promise<{
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
} | null> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_prompt_template_by_id', { id });
  }
  return fetchApi('/api/prompt-templates/get', { id });
}

export async function updatePromptTemplate(
  id: string,
  template: {
    name: string;
    content: string;
    category: string;
  }
): Promise<{
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
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('update_prompt_template', { id, template });
  }
  return fetchApi('/api/prompt-templates/update', { id, ...template });
}

export async function deletePromptTemplate(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_prompt_template', { id });
  }
  return fetchApi('/api/prompt-templates/delete', { id });
}

export async function updatePromptTemplateFavorite(
  id: string,
  is_favorite: boolean
): Promise<{
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
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('update_prompt_template_favorite', { id, is_favorite });
  }
  return fetchApi('/api/prompt-templates/update-favorite', { id, is_favorite });
}

export async function updatePromptTemplateGroup(
  id: string,
  group: string
): Promise<{
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
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('update_prompt_template_group', { id, group });
  }
  return fetchApi('/api/prompt-templates/update-group', { id, group });
}

export async function exportPromptTemplates(ids: string[]): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('export_prompt_templates', { ids });
  }
  return fetchApi('/api/prompt-templates/export', { ids });
}

export async function importPromptTemplates(
  jsonData: string,
  strategy: 'skip' | 'overwrite' | 'rename'
): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('import_prompt_templates', { jsonData, strategy });
  }
  return fetchApi('/api/prompt-templates/import', { jsonData, strategy });
}

export async function incrementTemplateUsage(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('increment_template_usage', { id });
  }
  return fetchApi('/api/prompt-templates/increment-usage', { id });
}

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export async function addPromptHistory(prompt: string): Promise<PromptHistoryItem> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('add_prompt_history', { prompt });
  }
  return fetchApi('/api/prompt-history/add', { prompt });
}

export async function getPromptHistory(limit: number = 20): Promise<PromptHistoryItem[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_prompt_history', { limit });
  }
  return fetchApi(`/api/prompt-history/list?limit=${limit}`);
}

export async function deletePromptHistory(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_prompt_history', { id });
  }
  return fetchApi('/api/prompt-history/delete', { id });
}

export async function clearPromptHistory(): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('clear_prompt_history');
  }
  return fetchApi('/api/prompt-history/clear');
}

export interface SavedFilter {
  id: string;
  name: string;
  model?: string;
  prompt_keyword?: string;
  start_date?: string;
  end_date?: string;
  character?: string;
  width_min?: number;
  width_max?: number;
  height_min?: number;
  height_max?: number;
  quality?: string;
  created_at: string;
}

export async function addSavedFilter(
  filter: Omit<SavedFilter, 'id' | 'created_at'>
): Promise<SavedFilter> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('add_saved_filter', {
      filter: { ...filter, id: `filter_${Date.now()}`, created_at: '' },
    });
  }
  return fetchApi('/api/saved-filters/add', filter);
}

export async function getSavedFilters(): Promise<SavedFilter[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_saved_filters');
  }
  return fetchApi('/api/saved-filters/list');
}

export async function deleteSavedFilter(id: string): Promise<boolean> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_saved_filter', { id });
  }
  return fetchApi('/api/saved-filters/delete', { id });
}

export interface ImageFeature {
  character_name: string;
  image_path: string;
  hash: string;
  width: number;
  height: number;
  file_size: number;
}

export interface DuplicateGroup {
  representative: ImageFeature;
  duplicates: ImageFeature[];
  similarity: number;
  suggested_action: string;
}

export interface TagSuggestion {
  character_name: string;
  suggested_tags: string[];
  confidence: number;
  reason: string;
}

export interface OrganizationSuggestion {
  duplicates: DuplicateGroup[];
  tag_suggestions: TagSuggestion[];
  total_images: number;
  duplicate_count: number;
}

export interface OrganizationActionRequest {
  action_type: string;
  target: string;
  new_tags?: string[];
  keep_representative?: boolean;
}

export interface OrganizationActionLog {
  id: string;
  action_type: string;
  target: string;
  original_value?: string;
  new_value?: string;
  timestamp: string;
  undone: boolean;
}

export async function analyzeReferenceLibrary(): Promise<OrganizationSuggestion> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('analyze_reference_library');
  }
  return fetchApi('/api/organization/analyze');
}

export async function executeOrganizationAction(
  action: OrganizationActionRequest
): Promise<OrganizationActionLog> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('execute_organization_action', { action });
  }
  return fetchApi('/api/organization/execute', action);
}

export async function undoOrganizationAction(logId: string): Promise<OrganizationActionLog> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('undo_organization_action', { logId });
  }
  return fetchApi('/api/organization/undo', { logId });
}

export async function getOrganizationActionLog(): Promise<OrganizationActionLog[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('get_organization_action_log');
  }
  return fetchApi('/api/organization/log');
}

export async function deleteDuplicateImages(
  characterNames: string[],
  keepRepresentative: boolean
): Promise<number> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('delete_duplicate_images', { characterNames, keepRepresentative });
  }
  return fetchApi('/api/organization/delete-duplicates', { characterNames, keepRepresentative });
}

export interface ExportQuery {
  start_date?: string;
  end_date?: string;
  model?: string;
  prompt_keyword?: string;
  character?: string;
  selected_ids?: string[];
}

export interface ExportRecord {
  id: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  quality: string;
  created_at: string;
  image_filename?: string;
}

export interface ExportPackage {
  name: string;
  export_time: string;
  record_count: number;
  summary: {
    total_records: number;
    models_used: string[];
    date_range?: [string, string];
  };
}

export async function previewExportData(query: ExportQuery): Promise<ExportRecord[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('preview_export_data', { query });
  }
  return fetchApi('/api/export/preview', query);
}

export async function createExportPackage(
  query: ExportQuery,
  outputPath: string,
  packageName?: string
): Promise<ExportPackage> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke('create_export_package', { query, outputPath, packageName });
  }
  return fetchApi('/api/export/create', { query, outputPath, packageName });
}
