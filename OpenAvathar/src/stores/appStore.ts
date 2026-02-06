import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Purpose, CloudType, GenerationStatus } from '../types';

export interface GeneratedVideo {
    id: string;
    filename: string;
    url: string;
    timestamp: number;
    orientation: 'horizontal' | 'vertical';
    purpose: Purpose;
}

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

    // Generation Settings
    videoOrientation: 'horizontal' | 'vertical';
    maxFrames: number;
    audioCfgScale: number;

    // Generation State
    currentPromptId: string | null;
    generationStatus: GenerationStatus['step'];
    outputVideo: string | null;

    // Video History
    generatedVideos: GeneratedVideo[];

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
    setVideoOrientation: (orientation: 'horizontal' | 'vertical') => void;
    setMaxFrames: (frames: number) => void;
    setAudioCfgScale: (scale: number) => void;
    setGenerationStatus: (status: AppState['generationStatus']) => void;
    setCurrentPromptId: (id: string | null) => void;
    setOutputVideo: (url: string | null) => void;
    addGeneratedVideo: (video: GeneratedVideo) => void;
    clearVideoHistory: () => void;
    addLog: (line: string) => void;
    clearLogs: () => void;
    clearAuth: () => void;
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
            videoOrientation: 'horizontal',
            maxFrames: 120,
            audioCfgScale: 3.5,
            currentPromptId: null,
            generationStatus: 'idle',
            outputVideo: null,
            generatedVideos: [],
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
            setVideoOrientation: (videoOrientation) => set({ videoOrientation }),
            setMaxFrames: (maxFrames) => set({ maxFrames }),
            setAudioCfgScale: (audioCfgScale) => set({ audioCfgScale }),
            setGenerationStatus: (generationStatus) => set({ generationStatus }),
            setCurrentPromptId: (currentPromptId: string | null) => set({ currentPromptId }),
            setOutputVideo: (outputVideo) => set({ outputVideo }),
            addGeneratedVideo: (video) =>
                set((state) => ({
                    generatedVideos: [video, ...state.generatedVideos],
                })),
            clearVideoHistory: () => set({ generatedVideos: [] }),
            addLog: (line) =>
                set((state) => ({
                    logs: [...state.logs.slice(-999), line],
                })),
            clearLogs: () => set({ logs: [] }),
            clearAuth: () => {
                set({
                    apiKey: null,
                    isValidated: false,
                    podId: null,
                    podStatus: 'idle',
                    comfyuiUrl: null,
                    logServerUrl: null,
                    currentPromptId: null,
                    generationStatus: 'idle',
                    outputVideo: null,
                    logs: [],
                });
                localStorage.removeItem('open-avathar-storage');
            },
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
            // Only persist session and config data
            partialize: (state) => ({
                apiKey: state.apiKey,
                isValidated: state.isValidated,
                purpose: state.purpose,
                cloudType: state.cloudType,
                gpuType: state.gpuType,
                podId: state.podId,
                comfyuiUrl: state.comfyuiUrl,
                logServerUrl: state.logServerUrl,
                videoOrientation: state.videoOrientation,
                maxFrames: state.maxFrames,
                audioCfgScale: state.audioCfgScale,
                generatedVideos: state.generatedVideos,
            }),
        }
    )
);
