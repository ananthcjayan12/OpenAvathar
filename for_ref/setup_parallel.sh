#!/bin/bash

# Define absolute paths
COMFY_PATH="/workspace/runpod-slim/ComfyUI"
NODES_PATH="$COMFY_PATH/custom_nodes"

# Install aria2 if missing
if ! command -v aria2c &> /dev/null; then
    apt-get update && apt-get install -y aria2
fi

# Function to download in background
parallel_download() {
    local FILE_PATH=$1
    local URL=$2
    local TARGET_SIZE=$3
    # 1% Tolerance
    local MIN_SIZE=$(( TARGET_SIZE * 99 / 100 ))

    # Verification Check
    if [ -f "$FILE_PATH" ]; then
        local ACTUAL_SIZE=$(stat -c %s "$FILE_PATH")
        if [ "$ACTUAL_SIZE" -ge "$MIN_SIZE" ]; then
            echo "✅ [VALID] $(basename "$FILE_PATH") - Skipping."
            return 0
        fi
        rm "$FILE_PATH"
    fi

    echo "🚀 [STARTING] $(basename "$FILE_PATH")..."
    # -x 16: 16 connections | -s 16: 16 splits | -k 1M: 1MB chunks
    aria2c -x 16 -s 16 -k 1M -q -o "$(basename "$FILE_PATH")" -d "$(dirname "$FILE_PATH")" "$URL"
    
    # Check result after download finishes
    if [ $? -eq 0 ]; then
        echo "🎉 [COMPLETE] $(basename "$FILE_PATH")"
    else
        echo "❌ [FAILED] $(basename "$FILE_PATH")"
    fi
}

echo "--- 1. Installing Nodes (Sequential) ---"
cd "$NODES_PATH"
# Quick clone checks to save time
[ ! -d "ComfyUI-WanVideoWrapper" ] && git clone https://github.com/Kijai/ComfyUI-WanVideoWrapper.git
[ ! -d "ComfyUI-KJNodes" ] && git clone https://github.com/Kijai/ComfyUI-KJNodes.git
[ ! -d "ComfyUI-VideoHelperSuite" ] && git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
[ ! -d "ComfyUI-MelBandRoFormer" ] && git clone https://github.com/Kijai/ComfyUI-MelBandRoFormer.git

# Install requirements silently
pip install -r ComfyUI-WanVideoWrapper/requirements.txt > /dev/null 2>&1
pip install -r ComfyUI-MelBandRoFormer/requirements.txt > /dev/null 2>&1

echo "--- 2. Creating Directories ---"
mkdir -p "$COMFY_PATH/models/diffusion_models/WanVideo/InfiniteTalk"
mkdir -p "$COMFY_PATH/models/diffusion_models/MelBandRoformer"
mkdir -p "$COMFY_PATH/models/vae/wanvideo"
mkdir -p "$COMFY_PATH/models/text_encoders"
mkdir -p "$COMFY_PATH/models/clip_vision"
mkdir -p "$COMFY_PATH/models/loras/WanVideo/Lightx2v"

echo "--- 3. Launching ALL Downloads Simultaneously ---"

# The '&' at the end of each line makes them run at the same time
parallel_download "$COMFY_PATH/models/diffusion_models/WanVideo/wan2.1_i2v_480p_14B_fp8_scaled.safetensors" "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors" 17179869184 &

parallel_download "$COMFY_PATH/models/text_encoders/umt5-xxl-enc-bf16.safetensors" "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/umt5-xxl-enc-bf16.safetensors" 11811160064 &

parallel_download "$COMFY_PATH/models/diffusion_models/WanVideo/InfiniteTalk/Wan2_1-InfiniteTalk-Multi_fp8_e4m3fn_scaled_KJ.safetensors" "https://huggingface.co/Kijai/WanVideo_comfy_fp8_scaled/resolve/main/InfiniteTalk/Wan2_1-InfiniteTalk-Multi_fp8_e4m3fn_scaled_KJ.safetensors" 2791728742 &

parallel_download "$COMFY_PATH/models/clip_vision/clip_vision_h.safetensors" "https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/clip_vision/clip_vision_h.safetensors" 1288490188 &

parallel_download "$COMFY_PATH/models/diffusion_models/MelBandRoformer/MelBandRoformer_fp16.safetensors" "https://huggingface.co/Kijai/MelBandRoFormer_comfy/resolve/main/MelBandRoformer_fp16.safetensors" 457179136 &

parallel_download "$COMFY_PATH/models/vae/wanvideo/Wan2_1_VAE_bf16.safetensors" "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Wan2_1_VAE_bf16.safetensors" 254803968 &

parallel_download "$COMFY_PATH/models/loras/WanVideo/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors" "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors" 250000000 &

echo "⏳ Waiting for all background downloads to finish..."
wait
echo "✅ All downloads finished."
echo "--- Setup Complete ---"