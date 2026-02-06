import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Purpose, CloudType, GenerationStatus } from '../types';

interface AppState {
    // Auth (Not persisted)
    apiKey: string | null;
    isValidated: boolean;

    // Configuration (Persisted)
    purpose: Purpose | null;
    cloudType: CloudType;
    gpuType: string;

    // Pod State
    podId: string | null;
    podStatus: 'idle' | 'deploying' | 'running' | 'stopping' | 'failed';
    comfyuiUrl: string | null;
    logServerUrl: string | null;

    // Generation State
    currentPromptId: string | null;
    generationStatus: GenerationStatus['step'];
    outputVideo: string | null;

    // Logs
    logs: string[];

    // Actions
    setApiKey: (key: string | null) => void;
    setValidated: (isValid: boolean) => void;
    setPurpose: (purpose: Purpose | null) => void;
    setCloudType: (type: CloudType) => void;
    setGpuType: (type: string) => void;
    setPodId: (id: string | null) => void;
    setPodStatus: (status: AppState['podStatus']) => void;
    setUrls: (comfyui: string | null, logServer: string | null) => void;
    setGenerationStatus: (status: AppState['generationStatus']) => void;
    setPromptId: (id: string | null) => void;
    setOutputVideo: (url: string | null) => void;
    addLog: (line: string) => void;
    clearLogs: () => void;
    reset: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            // Initial State
            apiKey: null,
            isValidated: false,
            purpose: null,
            cloudType: 'SECURE',
            gpuType: 'NVIDIA GeForce RTX 4090',
            podId: null,
            podStatus: 'idle',
            comfyuiUrl: null,
            logServerUrl: null,
            currentPromptId: null,
            generationStatus: 'idle',
            outputVideo: null,
            logs: [],

            // Actions
            setApiKey: (apiKey) => set({ apiKey }),
            setValidated: (isValidated) => set({ isValidated }),
            setPurpose: (purpose) => set({ purpose }),
            setCloudType: (cloudType) => set({ cloudType }),
            setGpuType: (gpuType) => set({ gpuType }),
            setPodId: (podId) => set({ podId }),
            setPodStatus: (podStatus) => set({ podStatus }),
            setUrls: (comfyuiUrl, logServerUrl) => set({ comfyuiUrl, logServerUrl }),
            setGenerationStatus: (generationStatus) => set({ generationStatus }),
            setPromptId: (currentPromptId) => set({ currentPromptId }),
            setOutputVideo: (outputVideo) => set({ outputVideo }),
            addLog: (line) =>
                set((state) => ({
                    logs: [...state.logs.slice(-999), line],
                })),
            clearLogs: () => set({ logs: [] }),
            reset: () =>
                set({
                    apiKey: null,
                    isValidated: false,
                    purpose: null,
                    podId: null,
                    podStatus: 'idle',
                    comfyuiUrl: null,
                    logServerUrl: null,
                    currentPromptId: null,
                    generationStatus: 'idle',
                    outputVideo: null,
                    logs: [],
                }),
        }),
        {
            name: 'open-avathar-storage',
            storage: createJSONStorage(() => localStorage),
            // Only persist non-sensitive configuration data
            partialize: (state) => ({
                purpose: state.purpose,
                cloudType: state.cloudType,
                gpuType: state.gpuType,
            }),
        }
    )
);
