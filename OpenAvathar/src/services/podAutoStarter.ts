import { runpodApi } from './runpodApi';
import { useAppStore } from '@/stores/appStore';
import type { AppPod, Purpose } from '@/types';

export interface AutoStartOptions {
    onProgress?: (message: string) => void;
    timeoutMs?: number;
    pollIntervalMs?: number;
}

export class AutoStartError extends Error {
    canRetry: boolean;
    canManual: boolean;

    constructor(message: string, options: { canRetry: boolean; canManual: boolean }) {
        super(message);
        this.name = 'AutoStartError';
        this.canRetry = options.canRetry;
        this.canManual = options.canManual;
    }
}

const TEMPLATE_BY_PURPOSE: Record<Purpose, string> = {
    'wan2.2': '6au21jp9c9',
    'infinitetalk': 'qvidd7ityi',
};

function createPendingPod(params: {
    podId: string;
    name: string;
    purpose: Purpose;
    gpuType: string;
    cloudType: 'SECURE' | 'COMMUNITY';
}): AppPod {
    const now = Date.now();
    return {
        id: params.podId,
        name: params.name,
        purpose: params.purpose,
        status: 'deploying',
        comfyuiUrl: null,
        logServerUrl: null,
        gpuType: params.gpuType,
        createdAt: now,
        lastUsedAt: now,
    };
}

async function probeComfyUiReady(comfyuiUrl: string, timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(`${comfyuiUrl}/history`, {
                method: 'GET',
                signal: controller.signal,
            });
            if (response.ok) {
                return;
            }
        } catch (error) {
            // Ignore transient errors (502 while ComfyUI warms up)
        } finally {
            clearTimeout(timeout);
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    throw new AutoStartError('Pod is running but ComfyUI is still warming up. Please retry.', {
        canRetry: true,
        canManual: true,
    });
}

export async function ensurePodAvailable(options: AutoStartOptions = {}): Promise<string> {
    const { onProgress, timeoutMs = 5 * 60 * 1000, pollIntervalMs = 10000 } = options;
    const { apiKey, activePodId, pods, purpose, cloudType, gpuType } = useAppStore.getState();

    const effectivePurpose: Purpose = purpose || 'infinitetalk';

    if (!apiKey) {
        throw new AutoStartError('RunPod API key not set. Add it in Settings.', {
            canRetry: false,
            canManual: true,
        });
    }

    const activePod = activePodId ? pods[activePodId] : null;
    if (activePod?.status === 'running' && activePod.comfyuiUrl) {
        return activePod.id;
    }

    const availablePod = Object.values(pods).find(
        (pod) => pod.status === 'running' && pod.purpose === effectivePurpose && pod.comfyuiUrl
    );

    if (availablePod) {
        useAppStore.getState().setActivePodId(availablePod.id);
        return availablePod.id;
    }

    onProgress?.('Starting your studio...');

    const templateId = TEMPLATE_BY_PURPOSE[effectivePurpose];
    const podName = `OpenAvathar-${effectivePurpose}-${Date.now().toString().slice(-4)}`;

    const pod = await runpodApi.deployPod(apiKey, {
        name: podName,
        templateId,
        gpuTypeId: gpuType || 'NVIDIA GeForce RTX 4090',
        gpuCount: 1,
        cloudType: cloudType || 'COMMUNITY',
    });

    useAppStore.getState().addPod(
        createPendingPod({
            podId: pod.id,
            name: podName,
            purpose: effectivePurpose,
            gpuType: gpuType || 'NVIDIA GeForce RTX 4090',
            cloudType: cloudType || 'COMMUNITY',
        })
    );

    const startTime = Date.now();
    onProgress?.('Warming up the AI engine...');

    while (true) {
        if (Date.now() - startTime > timeoutMs) {
            throw new AutoStartError('Pod deployment timed out. Check Pods page.', {
                canRetry: true,
                canManual: true,
            });
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const status = await runpodApi.getPodStatus(apiKey, pod.id);

        if (status.desiredStatus === 'RUNNING' && status.runtime) {
            const comfyUrl = `https://${pod.id}-8188.proxy.runpod.net`;
            const logUrl = `https://${pod.id}-8001.proxy.runpod.net`;

            useAppStore.getState().updatePod(pod.id, {
                status: 'running',
                comfyuiUrl: comfyUrl,
                logServerUrl: logUrl,
            });
            useAppStore.getState().setActivePodId(pod.id);

            onProgress?.('Finalizing ComfyUI startup...');
            await probeComfyUiReady(comfyUrl, Math.min(timeoutMs, 3 * 60 * 1000));
            onProgress?.('Studio ready. Preparing generation...');
            return pod.id;
        }

        if (status.desiredStatus === 'TERMINATED' || status.desiredStatus === 'EXITED') {
            useAppStore.getState().removePod(pod.id);
            throw new AutoStartError('Pod failed to start. Try again.', {
                canRetry: true,
                canManual: true,
            });
        }

        onProgress?.('Still warming up...');
    }
}
