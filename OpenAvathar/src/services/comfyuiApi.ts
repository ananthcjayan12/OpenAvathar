import axios from 'axios';
import type { PromptStatus, ComfyQueueResponse } from '../types';

/**
 * Service to interact with ComfyUI REST API on the deployed Pod
 */
class ComfyUIService {
    private getBaseUrl(podId: string) {
        // RunPod HTTP proxy URL for port 8188
        return `https://${podId}-8188.proxy.runpod.net`;
    }

    /**
     * Uploads an image or audio file to ComfyUI's input directory
     */
    async uploadFile(comfyuiUrl: string, file: File): Promise<string> {
        const formData = new FormData();
        formData.append('image', file);

        const response = await axios.post(`${comfyuiUrl}/upload/image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.name;
    }

    /**
     * Queues a workflow for execution
     */
    async queueWorkflow(comfyuiUrl: string, workflow: object): Promise<ComfyQueueResponse> {
        const response = await axios.post(`${comfyuiUrl}/prompt`, {
            prompt: workflow,
        });

        return { prompt_id: response.data.prompt_id };
    }

    /**
     * Polls ComfyUI history to check if a prompt has finished
     */
    async getGenerationStatus(comfyuiUrl: string, promptId: string): Promise<{ status: 'completed' | 'failed' | 'running'; outputs?: Array<{ filename: string }> }> {
        try {
            const response = await axios.get(`${comfyuiUrl}/history/${promptId}`);
            const history = response.data[promptId];

            if (!history) {
                return { status: 'running' };
            }

            const outputs = history.outputs;
            const outputFiles: Array<{ filename: string }> = [];

            for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                const media = nodeOutput.gifs?.[0] || nodeOutput.videos?.[0] || nodeOutput.images?.[0];

                if (media) {
                    const filename = media.subfolder ? `${media.subfolder}/${media.filename}` : media.filename;
                    outputFiles.push({ filename });
                }
            }

            return {
                status: 'completed',
                outputs: outputFiles
            };
        } catch (error) {
            console.error('ComfyUI Status Check Error:', error);
            return { status: 'failed' };
        }
    }

    /**
     * Legacy method for backward compatibility
     */
    async getStatus(podId: string, promptId: string): Promise<PromptStatus> {
        const baseUrl = this.getBaseUrl(podId);

        try {
            const response = await axios.get(`${baseUrl}/history/${promptId}`);
            const history = response.data[promptId];

            if (!history) {
                return { status: 'RUNNING', progress: 50 };
            }

            const outputs = history.outputs;
            let outputFilename = undefined;

            for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                const media = nodeOutput.gifs?.[0] || nodeOutput.videos?.[0] || nodeOutput.images?.[0];

                if (media) {
                    outputFilename = media.subfolder ? `${media.subfolder}/${media.filename}` : media.filename;
                    break;
                }
            }

            return {
                status: 'COMPLETED',
                progress: 100,
                outputFilename,
            };
        } catch (error) {
            console.error('ComfyUI Status Check Error:', error);
            return { status: 'FAILED', progress: 0 };
        }
    }

    /**
     * Helper to construct the view/download URL for an output file
     */
    getOutputUrl(comfyuiUrl: string, filename: string): string {
        return `${comfyuiUrl}/view?filename=${encodeURIComponent(filename)}&type=output`;
    }
}

export const comfyuiApi = new ComfyUIService();
