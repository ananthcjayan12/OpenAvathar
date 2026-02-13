import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Purpose, CloudType, GenerationStatus, AppPod } from '../types';

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

    // Pod Management (Persisted)
    pods: Record<string, AppPod>;
    activePodId: string | null;

    // Generation Settings
    videoOrientation: 'horizontal' | 'vertical';
    maxFrames: number;
    audioCfgScale: number;

    // Legacy Generation State (being migrated to jobQueue)
    currentPromptId: string | null;
    generationStatus: GenerationStatus['step'];
    outputVideo: string | null;

    // Job Queue Integration
    activeJobId: string | null; // Currently focused job in UI (not blocking)

    // Auto-start Status (Not persisted)
    isAutoStarting: boolean;
    autoStartMessage: string | null;

    // License & Trial State (Persisted)
    isLicensed: boolean;
    licenseKey: string | null;
    freeTrialUsed: boolean;
    generationCount: number;

    // Licensing (Worker-backed)
    fingerprint: string | null;
    canGenerate: boolean;
    dailyLimit: number;
    usedToday: number;
    resetsIn: string | null;

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

    // Pod Actions
    addPod: (pod: AppPod) => void;
    updatePod: (podId: string, updates: Partial<AppPod>) => void;
    removePod: (podId: string) => void;
    setActivePodId: (podId: string | null) => void;

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

    // Job Queue Actions
    setActiveJobId: (jobId: string | null) => void;

    // Auto-start Actions
    setAutoStartState: (isAutoStarting: boolean, message: string | null) => void;

    // License Actions
    setLicenseKey: (key: string | null) => void;
    setLicensed: (licensed: boolean) => void;
    setFingerprint: (fingerprint: string) => void;
    setUsageStatus: (status: {
        canGenerate: boolean;
        dailyLimit: number;
        usedToday: number;
        resetsIn: string | null;
    }) => void;
    markTrialUsed: () => void;
    incrementGenerationCount: () => void;
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
            pods: {},
            activePodId: null,
            videoOrientation: 'horizontal',
            maxFrames: 100, // Updated default (4s at 25fps)
            audioCfgScale: 1.0,
            currentPromptId: null,
            generationStatus: 'idle',
            outputVideo: null,
            activeJobId: null,
            isAutoStarting: false,
            autoStartMessage: null,
            isLicensed: false,
            licenseKey: null,
            freeTrialUsed: false,
            generationCount: 0,
            fingerprint: null,
            canGenerate: true,
            dailyLimit: 1,
            usedToday: 0,
            resetsIn: null,
            generatedVideos: [],
            logs: [],

            // Actions
            setApiKey: (apiKey) => set({ apiKey }),
            setValidated: (isValidated) => set({ isValidated }),
            setPurpose: (purpose) => set({ purpose }),
            setCloudType: (cloudType) => set({ cloudType }),
            setGpuType: (gpuType) => set({ gpuType }),

            // Pod Actions
            addPod: (pod) =>
                set((state) => ({
                    pods: { ...state.pods, [pod.id]: pod },
                    activePodId: pod.id,
                })),
            updatePod: (podId, updates) =>
                set((state) => ({
                    pods: {
                        ...state.pods,
                        [podId]: state.pods[podId] ? { ...state.pods[podId], ...updates } : state.pods[podId],
                    },
                })),
            removePod: (podId) =>
                set((state) => {
                    const { [podId]: removed, ...remainingPods } = state.pods;
                    const hasRemainingPods = Object.keys(remainingPods).length > 0;
                    return {
                        pods: remainingPods,
                        activePodId: state.activePodId === podId ? null : state.activePodId,
                        generatedVideos: hasRemainingPods ? state.generatedVideos : [],
                    };
                }),
            setActivePodId: (activePodId) => set({ activePodId }),

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

            // Job Queue Actions
            setActiveJobId: (activeJobId) => set({ activeJobId }),

            // Auto-start Actions
            setAutoStartState: (isAutoStarting, autoStartMessage) =>
                set({ isAutoStarting, autoStartMessage }),

            // License Actions
            setLicenseKey: (licenseKey) => set({ licenseKey, isLicensed: !!licenseKey }),
            setLicensed: (isLicensed) => set({ isLicensed }),
            setFingerprint: (fingerprint) => set({ fingerprint }),
            setUsageStatus: ({ canGenerate, dailyLimit, usedToday, resetsIn }) =>
                set({ canGenerate, dailyLimit, usedToday, resetsIn }),
            markTrialUsed: () => set({ freeTrialUsed: true }),
            incrementGenerationCount: () =>
                set((state) => ({ generationCount: state.generationCount + 1 })),
            clearAuth: () => {
                set({
                    apiKey: null,
                    isValidated: false,
                    pods: {},
                    activePodId: null,
                    currentPromptId: null,
                    generationStatus: 'idle',
                    outputVideo: null,
                    logs: [],
                    isAutoStarting: false,
                    autoStartMessage: null,
                    fingerprint: null,
                    canGenerate: true,
                    dailyLimit: 1,
                    usedToday: 0,
                    resetsIn: null,
                });
                localStorage.removeItem('open-avathar-storage');
            },
            reset: () =>
                set({
                    apiKey: null,
                    isValidated: false,
                    purpose: null,
                    pods: {},
                    activePodId: null,
                    currentPromptId: null,
                    generationStatus: 'idle',
                    outputVideo: null,
                    logs: [],
                    isAutoStarting: false,
                    autoStartMessage: null,
                    fingerprint: null,
                    canGenerate: true,
                    dailyLimit: 1,
                    usedToday: 0,
                    resetsIn: null,
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
                pods: state.pods,
                activePodId: state.activePodId,
                videoOrientation: state.videoOrientation,
                maxFrames: state.maxFrames,
                audioCfgScale: state.audioCfgScale,
                generatedVideos: state.generatedVideos,
                // License state (persisted)
                isLicensed: state.isLicensed,
                licenseKey: state.licenseKey,
                freeTrialUsed: state.freeTrialUsed,
                generationCount: state.generationCount,
                fingerprint: state.fingerprint,
                canGenerate: state.canGenerate,
                dailyLimit: state.dailyLimit,
                usedToday: state.usedToday,
                resetsIn: state.resetsIn,
            }),
        }
    )
);
