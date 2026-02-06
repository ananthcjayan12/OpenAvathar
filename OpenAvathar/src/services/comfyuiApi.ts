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
     * Note: ComfyUI uses /upload/image for all file types (images and audio)
     */
    async uploadFile(comfyuiUrl: string, file: File): Promise<string> {
        const formData = new FormData();

        // ComfyUI expects 'image' field name for all uploads (including audio)
        formData.append('image', file);

        try {
            const response = await axios.post(`${comfyuiUrl}/upload/image`, formData, {
                headers: {
                    // Don't set Content-Type - let browser set it with boundary
                },
                // Add timeout for large files
                timeout: 60000, // 60 seconds
            });

            return response.data.name;
        } catch (error: any) {
            console.error('File upload error:', error);
            if (error.response) {
                throw new Error(`Upload failed: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Upload failed: No response from server. Check CORS settings.');
            } else {
                throw new Error(`Upload failed: ${error.message}`);
            }
        }
    }

    /**
     * Queues a workflow for execution
     */
    async queueWorkflow(comfyuiUrl: string, workflow: object): Promise<ComfyQueueResponse> {
        try {
            const response = await axios.post(`${comfyuiUrl}/prompt`, {
                prompt: workflow,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000, // 30 seconds
            });

            return { prompt_id: response.data.prompt_id };
        } catch (error: any) {
            console.error('Workflow queue error:', error);
            if (error.response) {
                throw new Error(`Queue failed: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Queue failed: No response from server. Check if ComfyUI is running.');
            } else {
                throw new Error(`Queue failed: ${error.message}`);
            }
        }
    }

    /**
     * Polls ComfyUI history to check if a prompt has finished
     */
    async getGenerationStatus(comfyuiUrl: string, promptId: string): Promise<{ status: 'completed' | 'failed' | 'running'; outputs?: Array<{ filename: string }> }> {
        try {
            const response = await axios.get(`${comfyuiUrl}/history/${promptId}`, {
                timeout: 10000, // 10 seconds
            });
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
