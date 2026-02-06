import wan22Workflow from '../assets/workflows/api_img_to_video.json';
import infiniteTalkWorkflow from '../assets/workflows/Infinitetalk.json';
import type { Wan22Config, InfiniteTalkConfig } from '../types';

/**
 * Service to patch ComfyUI workflow JSONs with user-provided values
 */
class WorkflowPatcher {
    /**
     * Patches the Wan 2.2 Image-to-Video workflow
     */
    patchWan22(config: Wan22Config) {
        // Deep clone to avoid mutating the original import
        const workflow = JSON.parse(JSON.stringify(wan22Workflow));

        // 1. Set the uploaded image
        // Node 97: LoadImage
        if (workflow["97"]) {
            workflow["97"].inputs.image = config.imageName;
        }

        // 2. Set the positive prompt
        // Node 93: CLIPTextEncode (Positive Prompt)
        if (workflow["93"]) {
            workflow["93"].inputs.text = config.prompt;
        }

        // 3. Set the dimensions based on orientation
        // Node 98: WanImageToVideo
        if (workflow["98"]) {
            // If orientation is provided, calculate dimensions
            if (config.orientation) {
                if (config.orientation === 'horizontal') {
                    workflow["98"].inputs.width = 1024;
                    workflow["98"].inputs.height = 576;
                } else {
                    workflow["98"].inputs.width = 576;
                    workflow["98"].inputs.height = 1024;
                }
            } else {
                // Use provided width/height
                workflow["98"].inputs.width = config.width;
                workflow["98"].inputs.height = config.height;
            }

            // Set max frames if provided
            if (config.maxFrames !== undefined) {
                workflow["98"].inputs.num_frames = config.maxFrames;
            }
        }

        // 4. Set audio CFG scale if provided
        // This might be in a different node - check the workflow JSON
        if (config.audioCfgScale !== undefined && workflow["98"]) {
            workflow["98"].inputs.audio_cfg_scale = config.audioCfgScale;
        }

        return workflow;
    }

    /**
     * Patches the InfiniteTalk Talking Head workflow
     */
    patchInfiniteTalk(config: InfiniteTalkConfig) {
        const workflow = JSON.parse(JSON.stringify(infiniteTalkWorkflow));

        // 1. Set the uploaded image
        // Node 313: LoadImage
        if (workflow["313"]) {
            workflow["313"].inputs.image = config.imageName;
        }

        // 2. Set the uploaded audio
        // Node 125: LoadAudio
        if (workflow["125"]) {
            workflow["125"].inputs.audio = config.audioName;
        }

        // 3. Set the prompt (defaults to "a person is singing/speaking" if empty)
        // Node 241: WanVideoTextEncodeCached
        if (workflow["241"]) {
            workflow["241"].inputs.positive_prompt = config.prompt || "a person is speaking";
        }

        // 4. Set dimensions based on orientation
        // Node 245/246: Width and Height
        if (config.orientation) {
            if (config.orientation === 'horizontal') {
                // Landscape mode
                if (workflow["245"]) workflow["245"].inputs.value = 832;
                if (workflow["246"]) workflow["246"].inputs.value = 480;
            } else {
                // Portrait mode (default)
                if (workflow["245"]) workflow["245"].inputs.value = 480;
                if (workflow["246"]) workflow["246"].inputs.value = 832;
            }
        } else {
            // Default portrait
            if (workflow["245"]) workflow["245"].inputs.value = 480;
            if (workflow["246"]) workflow["246"].inputs.value = 832;
        }

        // 5. Set max frames if provided
        // This might be in the InfiniteTalk node - check workflow JSON for the correct node
        if (config.maxFrames !== undefined) {
            // You may need to adjust the node ID based on your workflow
            // Common nodes: InfiniteTalkNode or similar
            if (workflow["241"]) {
                workflow["241"].inputs.num_frames = config.maxFrames;
            }
        }

        // 6. Set audio CFG scale if provided
        if (config.audioCfgScale !== undefined && workflow["241"]) {
            workflow["241"].inputs.audio_cfg_scale = config.audioCfgScale;
        }

        return workflow;
    }

    /**
     * Dynamically patches the correct workflow based on purpose
     */
    async patchWorkflow(purpose: 'wan2.2' | 'infinitetalk', config: Wan22Config | InfiniteTalkConfig): Promise<object> {
        if (purpose === 'wan2.2') {
            return this.patchWan22(config as Wan22Config);
        } else {
            return this.patchInfiniteTalk(config as InfiniteTalkConfig);
        }
    }

    /**
     * Returns the base workflow JSONs for manual editing or reference
     */
    getBaseWorkflows() {
        return {
            wan22: wan22Workflow,
            infiniteTalk: infiniteTalkWorkflow,
        };
    }
}

export const workflowPatcher = new WorkflowPatcher();
