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
                // Increased timeout for large files (especially audio files which can be 7MB+)
                timeout: 300000, // 5 minutes
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
    async getGenerationStatus(comfyuiUrl: string, promptId: string): Promise<{ status: 'completed' | 'failed' | 'running'; outputs?: Array<{ filename: string }>; error?: string }> {
        try {
            const response = await axios.get(`${comfyuiUrl}/history/${promptId}`, {
                timeout: 10000, // 10 seconds
            });
            const history = response.data[promptId];

            if (!history) {
                return { status: 'running' };
            }

            // Check for ComfyUI execution errors
            if (history.status?.status_str === 'error' || history.exception_message) {
                const errorMessage = history.exception_message || 'ComfyUI execution error';
                console.error(`[ComfyUI] Job ${promptId} failed:`, errorMessage);
                return {
                    status: 'failed',
                    error: errorMessage
                };
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

            // If it's in history but has no outputs, it might still be running or failed without error msg
            if (outputFiles.length === 0) {
                console.log(`[ComfyUI] Job ${promptId} is in history but has no outputs yet.`);
                return { status: 'running' };
            }

            return {
                status: 'completed',
                outputs: outputFiles
            };
        } catch (error: any) {
            console.error('ComfyUI Status Check Error:', error);
            return { status: 'failed', error: error.message };
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
     * Fetches all output videos from ComfyUI history
     */
    async getOutputVideos(comfyuiUrl: string): Promise<Array<{ id: string; filename: string; url: string; timestamp: number }>> {
        try {
            console.log('[ComfyUI] Fetching history from:', `${comfyuiUrl}/history`);
            const response = await axios.get(`${comfyuiUrl}/history`, {
                timeout: 10000,
            });

            console.log('[ComfyUI] History response:', response.data);
            const videos: Array<{ id: string; filename: string; url: string; timestamp: number }> = [];
            const history = response.data;

            // Iterate through all prompt IDs in history
            for (const promptId in history) {
                const item = history[promptId];
                console.log(`[ComfyUI] Processing prompt ${promptId}:`, item);
                const outputs = item.outputs;

                if (!outputs) {
                    console.log(`[ComfyUI] No outputs for prompt ${promptId}`);
                    continue;
                }

                // Look for video outputs in each node
                for (const nodeId in outputs) {
                    const nodeOutput = outputs[nodeId];
                    console.log(`[ComfyUI] Node ${nodeId} output:`, nodeOutput);

                    // Check all possible media arrays (gifs, videos, images)
                    // Different workflows may use different output types
                    const mediaArrays = [
                        nodeOutput.gifs,
                        nodeOutput.videos,
                        nodeOutput.images
                    ].filter(arr => arr && arr.length > 0);

                    // Process all media files in all arrays
                    for (const mediaArray of mediaArrays) {
                        for (const media of mediaArray) {
                            if (media && media.filename) {
                                // Check if it's a video file by extension
                                const isVideo = /\.(mp4|webm|mov|avi|mkv|gif)$/i.test(media.filename);

                                if (isVideo) {
                                    const filename = media.subfolder ? `${media.subfolder}/${media.filename}` : media.filename;
                                    const url = this.getOutputUrl(comfyuiUrl, filename);

                                    // Use prompt creation time if available, otherwise use current time
                                    const timestamp = item.prompt?.[1] ? item.prompt[1] * 1000 : Date.now();

                                    console.log('[ComfyUI] Found video:', { promptId, filename, url, timestamp });

                                    videos.push({
                                        id: `${promptId}-${filename}`, // Use unique ID to avoid duplicates
                                        filename,
                                        url,
                                        timestamp
                                    });
                                }
                            }
                        }
                    }

                    if (mediaArrays.length === 0) {
                        console.log(`[ComfyUI] No media arrays found in node ${nodeId}`);
                    }
                }
            }

            console.log('[ComfyUI] Total videos found:', videos.length);

            // Remove duplicates based on filename
            const uniqueVideos = Array.from(
                new Map(videos.map(v => [v.filename, v])).values()
            );

            console.log('[ComfyUI] Unique videos after deduplication:', uniqueVideos.length);

            // Sort by timestamp, newest first
            return uniqueVideos.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('[ComfyUI] Failed to fetch output videos:', error);
            return [];
        }
    }


    /**
     * Interrupt/cancel a running generation
     * ComfyUI API: POST /interrupt
     */
    async interruptGeneration(comfyuiUrl: string): Promise<void> {
        try {
            await axios.post(`${comfyuiUrl}/interrupt`, {}, {
                timeout: 5000, // 5 seconds
            });
            console.log('[ComfyUI] Generation interrupted successfully');
        } catch (error: any) {
            console.error('[ComfyUI] Failed to interrupt generation:', error);
            // Don't throw - interruption is best-effort
        }
    }

    /**
     * Helper to construct the view/download URL for an output file
     */
    getOutputUrl(comfyuiUrl: string, filename: string): string {
        // Check if filename contains a subfolder
        const parts = filename.split('/');

        if (parts.length > 1) {
            // Has subfolder - pass subfolder and filename separately
            const subfolder = parts.slice(0, -1).join('/');
            const file = parts[parts.length - 1];
            return `${comfyuiUrl}/view?filename=${encodeURIComponent(file)}&subfolder=${encodeURIComponent(subfolder)}&type=output`;
        } else {
            // No subfolder - just pass filename
            return `${comfyuiUrl}/view?filename=${encodeURIComponent(filename)}&type=output`;
        }
    }
}

export const comfyuiApi = new ComfyUIService();
