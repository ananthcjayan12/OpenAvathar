import axios from 'axios';
import type { PromptStatus } from '../types';

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
    async uploadFile(podId: string, file: File): Promise<string> {
        const baseUrl = this.getBaseUrl(podId);
        const formData = new FormData();
        // ComfyUI standard endpoint expects 'image' key for all file uploads
        formData.append('image', file);

        const response = await axios.post(`${baseUrl}/upload/image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Returns the internal filename assigned by ComfyUI
        return response.data.name;
    }

    /**
     * Queues a workflow for execution
     * @param podId Deployed pod ID
     * @param workflow The patched ComfyUI API JSON object
     */
    async queueWorkflow(podId: string, workflow: object): Promise<string> {
        const baseUrl = this.getBaseUrl(podId);
        const response = await axios.post(`${baseUrl}/prompt`, {
            prompt: workflow,
        });

        return response.data.prompt_id;
    }

    /**
     * Polls ComfyUI history to check if a prompt has finished
     */
    async getStatus(podId: string, promptId: string): Promise<PromptStatus> {
        const baseUrl = this.getBaseUrl(podId);

        try {
            const response = await axios.get(`${baseUrl}/history/${promptId}`);
            const history = response.data[promptId];

            if (!history) {
                // Prompt is still in queue or execution
                return { status: 'RUNNING', progress: 50 };
            }

            // Prompt is finished, extract outputs
            const outputs = history.outputs;
            let outputFilename = undefined;

            // Look for media outputs (videos, gifs, or images)
            for (const nodeId in outputs) {
                const nodeOutput = outputs[nodeId];
                const media = nodeOutput.gifs?.[0] || nodeOutput.videos?.[0] || nodeOutput.images?.[0];

                if (media) {
                    // Construct filename with subfolder if it exists (e.g., "video/ComfyUI_00001.mp4")
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
    getOutputUrl(podId: string, filename: string): string {
        const baseUrl = this.getBaseUrl(podId);
        // Standard ComfyUI view endpoint
        return `${baseUrl}/view?filename=${encodeURIComponent(filename)}&type=output`;
    }
}

export const comfyuiApi = new ComfyUIService();
