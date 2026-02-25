import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  APIConfig,
  CharacterBinding,
  ImageGenerationParams,
  ParsedPrompt,
} from '../types';

interface AppState {
  apiConfig: APIConfig;
  parsedPrompt: ParsedPrompt | null;
  characterBindings: CharacterBinding[];
  generationParams: Partial<ImageGenerationParams>;
  
  setApiConfig: (config: APIConfig) => void;
  setParsedPrompt: (prompt: ParsedPrompt | null) => void;
  setCharacterBindings: (bindings: CharacterBinding[]) => void;
  addCharacterBinding: (binding: CharacterBinding) => void;
  removeCharacterBinding: (characterName: string) => void;
  updateCharacterBinding: (characterName: string, binding: Partial<CharacterBinding>) => void;
  setGenerationParams: (params: Partial<ImageGenerationParams>) => void;
  reset: () => void;
}

const defaultApiConfig: APIConfig = {
  jimeng: {
    baseUrl: '',
    apiKey: '',
  },
  bananaPro: {
    baseUrl: '',
    apiKey: '',
  },
};

const defaultGenerationParams: Partial<ImageGenerationParams> = {
  model: 'jimeng',
  width: 1024,
  height: 1024,
  count: 1,
  quality: 'standard',
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiConfig: defaultApiConfig,
      parsedPrompt: null,
      characterBindings: [],
      generationParams: defaultGenerationParams,

      setApiConfig: (config) => set({ apiConfig: config }),
      
      setParsedPrompt: (prompt) => set({ parsedPrompt: prompt }),
      
      setCharacterBindings: (bindings) => set({ characterBindings: bindings }),
      
      addCharacterBinding: (binding) =>
        set((state) => ({
          characterBindings: [...state.characterBindings, binding],
        })),
      
      removeCharacterBinding: (characterName) =>
        set((state) => ({
          characterBindings: state.characterBindings.filter(
            (b) => b.characterName !== characterName
          ),
        })),
      
      updateCharacterBinding: (characterName, updates) =>
        set((state) => ({
          characterBindings: state.characterBindings.map((b) =>
            b.characterName === characterName ? { ...b, ...updates } : b
          ),
        })),
      
      setGenerationParams: (params) =>
        set((state) => ({
          generationParams: { ...state.generationParams, ...params },
        })),
      
      reset: () =>
        set({
          parsedPrompt: null,
          characterBindings: [],
          generationParams: defaultGenerationParams,
        }),
    }),
    {
      name: 'xuanchen-huiben-storage',
      partialize: (state) => ({
        apiConfig: state.apiConfig,
        generationParams: state.generationParams,
      }),
    }
  )
);
