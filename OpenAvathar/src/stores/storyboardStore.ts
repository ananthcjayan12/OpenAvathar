/**
 * Storyboard Feature State Management
 * 
 * Manages the state for the Storyboard feature including:
 * - API configuration
 * - Current script generation session
 * - Audio generation
 * - Script history
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Script,
  InputMode,
  GenerationStatus,
  ScriptTone,
  Voice,
  SavedScript,
  UserFacingError
} from '@/types/storyboard';
import { secureStorage } from '@/utils/secureStorage';

interface StoryboardState {
  // Configuration
  geminiApiKey: string | null;
  elevenLabsApiKey: string | null;
  defaultVoiceId: string | null;
  defaultTone: ScriptTone;
  autoSave: boolean;

  // Current Session
  inputMode: InputMode;
  inputContent: string;
  youtubeUrl: string;

  // Generation State
  scriptStatus: GenerationStatus;
  audioStatus: GenerationStatus;
  
  // Output
  currentScript: Script | null;
  audioUrl: string | null;
  audioBlob: Blob | null;

  // Voices Cache
  voices: Voice[];
  voicesLastFetched: number | null;

  // History
  savedScripts: SavedScript[];

  // Error Handling
  error: UserFacingError | null;

  // Actions - Configuration
  setGeminiApiKey: (key: string | null) => void;
  setElevenLabsApiKey: (key: string | null) => void;
  setDefaultVoiceId: (id: string | null) => void;
  setDefaultTone: (tone: ScriptTone) => void;
  setAutoSave: (enabled: boolean) => void;

  // Actions - Input
  setInputMode: (mode: InputMode) => void;
  setInputContent: (content: string) => void;
  setYoutubeUrl: (url: string) => void;

  // Actions - Generation
  setScriptStatus: (status: GenerationStatus) => void;
  setAudioStatus: (status: GenerationStatus) => void;
  setCurrentScript: (script: Script | null) => void;
  setAudioUrl: (url: string | null) => void;
  setAudioBlob: (blob: Blob | null) => void;

  // Actions - Voices
  setVoices: (voices: Voice[]) => void;
  updateVoicesCache: () => void;

  // Actions - History
  saveScript: (script: Script, tags?: string[]) => void;
  loadScript: (scriptId: string) => void;
  deleteScript: (scriptId: string) => void;
  clearHistory: () => void;

  // Actions - Error
  setError: (error: UserFacingError | null) => void;
  clearError: () => void;

  // Actions - Reset
  resetSession: () => void;
  clearAllData: () => void;
}

export const useStoryboardStore = create<StoryboardState>()(
  persist(
    (set, get) => ({
      // Initial State - Configuration
      geminiApiKey: null,
      elevenLabsApiKey: null,
      defaultVoiceId: null,
      defaultTone: 'energetic',
      autoSave: true,

      // Initial State - Session
      inputMode: 'idea',
      inputContent: '',
      youtubeUrl: '',

      // Initial State - Generation
      scriptStatus: 'idle',
      audioStatus: 'idle',

      // Initial State - Output
      currentScript: null,
      audioUrl: null,
      audioBlob: null,

      // Initial State - Voices
      voices: [],
      voicesLastFetched: null,

      // Initial State - History
      savedScripts: [],

      // Initial State - Error
      error: null,

      // Actions - Configuration
      setGeminiApiKey: (key) => {
        if (key) {
          secureStorage.set('gemini_api_key', key);
        } else {
          secureStorage.remove('gemini_api_key');
        }
        set({ geminiApiKey: key });
      },

      setElevenLabsApiKey: (key) => {
        if (key) {
          secureStorage.set('elevenlabs_api_key', key);
        } else {
          secureStorage.remove('elevenlabs_api_key');
        }
        set({ elevenLabsApiKey: key });
      },

      setDefaultVoiceId: (id) => set({ defaultVoiceId: id }),
      setDefaultTone: (tone) => set({ defaultTone: tone }),
      setAutoSave: (enabled) => set({ autoSave: enabled }),

      // Actions - Input
      setInputMode: (mode) => set({ inputMode: mode }),
      setInputContent: (content) => set({ inputContent: content }),
      setYoutubeUrl: (url) => set({ youtubeUrl: url }),

      // Actions - Generation
      setScriptStatus: (status) => set({ scriptStatus: status }),
      setAudioStatus: (status) => set({ audioStatus: status }),
      setCurrentScript: (script) => {
        set({ currentScript: script });
        
        // Auto-save if enabled
        if (script && get().autoSave) {
          get().saveScript(script);
        }
      },
      setAudioUrl: (url) => set({ audioUrl: url }),
      setAudioBlob: (blob) => set({ audioBlob: blob }),

      // Actions - Voices
      setVoices: (voices) => set({ voices }),
      updateVoicesCache: () => set({ voicesLastFetched: Date.now() }),

      // Actions - History
      saveScript: (script, tags = []) => {
        const savedScript: SavedScript = {
          script,
          savedAt: Date.now(),
          tags
        };

        set((state) => {
          // Check if script already exists
          const existingIndex = state.savedScripts.findIndex(
            s => s.script.id === script.id
          );

          let newSavedScripts;
          if (existingIndex !== -1) {
            // Update existing
            newSavedScripts = [...state.savedScripts];
            newSavedScripts[existingIndex] = savedScript;
          } else {
            // Add new, keep last 50 scripts
            newSavedScripts = [savedScript, ...state.savedScripts].slice(0, 50);
          }

          return { savedScripts: newSavedScripts };
        });
      },

      loadScript: (scriptId) => {
        const savedScript = get().savedScripts.find(
          s => s.script.id === scriptId
        );
        if (savedScript) {
          set({ currentScript: savedScript.script });
        }
      },

      deleteScript: (scriptId) => {
        set((state) => ({
          savedScripts: state.savedScripts.filter(
            s => s.script.id !== scriptId
          )
        }));
      },

      clearHistory: () => set({ savedScripts: [] }),

      // Actions - Error
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Actions - Reset
      resetSession: () => set({
        inputContent: '',
        youtubeUrl: '',
        scriptStatus: 'idle',
        audioStatus: 'idle',
        currentScript: null,
        audioUrl: null,
        audioBlob: null,
        error: null,
      }),

      clearAllData: () => {
        secureStorage.clear();
        set({
          geminiApiKey: null,
          elevenLabsApiKey: null,
          defaultVoiceId: null,
          savedScripts: [],
          voices: [],
          voicesLastFetched: null,
        });
        get().resetSession();
      },
    }),
    {
      name: 'storyboard-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive configuration and history
      partialize: (state) => ({
        defaultVoiceId: state.defaultVoiceId,
        defaultTone: state.defaultTone,
        autoSave: state.autoSave,
        savedScripts: state.savedScripts,
        voices: state.voices,
        voicesLastFetched: state.voicesLastFetched,
        inputMode: state.inputMode,
      }),
    }
  )
);

// Initialize API keys from secure storage on load
if (typeof window !== 'undefined') {
  const geminiKey = secureStorage.get('gemini_api_key');
  const elevenLabsKey = secureStorage.get('elevenlabs_api_key');
  
  if (geminiKey) {
    useStoryboardStore.setState({ geminiApiKey: geminiKey });
  }
  if (elevenLabsKey) {
    useStoryboardStore.setState({ elevenLabsApiKey: elevenLabsKey });
  }
}
