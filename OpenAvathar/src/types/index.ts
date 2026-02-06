/**
 * Common Purpose types for the application
 */
export type Purpose = 'wan2.2' | 'infinitetalk';

export type CloudType = 'SECURE' | 'COMMUNITY';

/**
 * Pod related interfaces (RunPod)
 */
export interface Pod {
    id: string;
    name: string;
    desiredStatus: 'RUNNING' | 'DEPLOYING' | 'TERMINATED' | 'UNKNOWN';
    imageName?: string;
    runtime?: {
        uptimeInSeconds: number;
        ports: Array<{
            ip: string;
            isIpPublic: boolean;
            privatePort: number;
            publicPort: number;
            type: string;
        }>;
    };
}

export interface PodStatus {
    id: string;
    status: Pod['desiredStatus'];
    comfyuiUrl?: string;
    logServerUrl?: string;
}

export interface GPU {
    id: string;
    displayName: string;
    memoryInGb: number;
    secureCloud: boolean;
    communityCloud: boolean;
    securePrice?: number;
    lowestPrice?: {
        minimumBidPrice: number;
        uninterruptablePrice: number;
    };
}

export interface Volume {
    id: string;
    name: string;
    size: number;
    dataCenterId: string;
}

export interface DeployConfig {
    name: string;
    templateId: string;
    gpuTypeId: string;
    gpuCount: number;
    cloudType: CloudType;
    networkVolumeId?: string;
}

/**
 * ComfyUI related interfaces
 */
export interface ComfyPromptResponse {
    prompt_id: string;
    number: number;
    node_errors?: Record<string, any>;
}

export interface ComfyQueueResponse {
    prompt_id: string;
}

export interface PromptStatus {
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    progress: number;
    outputFilename?: string;
}

export interface GenerationStatus {
    step: 'idle' | 'uploading' | 'queuing' | 'generating' | 'completed' | 'failed';
    error?: string;
}

/**
 * Workflow patch config
 */
export interface Wan22Config {
    imageName: string;
    prompt: string;
    width: number;
    height: number;
}

export interface InfiniteTalkConfig {
    imageName: string;
    audioName: string;
    prompt: string;
}
