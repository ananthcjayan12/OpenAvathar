#!/bin/bash

# Define absolute paths
COMFY_PATH="/workspace/runpod-slim/ComfyUI"
MODELS_PATH="$COMFY_PATH/models"

# Install aria2 if missing
if ! command -v aria2c &> /dev/null; then
    echo "Installing aria2..."
    apt-get update -qq && apt-get install -y -qq aria2
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
    # -x 16: 16 connections | -s 16: 16 splits | -k 1M: 1MB chunks | -q: quiet
    aria2c -x 16 -s 16 -k 1M -q -o "$(basename "$FILE_PATH")" -d "$(dirname "$FILE_PATH")" "$URL"
    
    if [ $? -eq 0 ]; then
        echo "🎉 [COMPLETE] $(basename "$FILE_PATH")"
    else
        echo "❌ [FAILED] $(basename "$FILE_PATH")"
    fi
}

echo "--- 1. Creating Directories ---"
mkdir -p "$MODELS_PATH/text_encoders"
mkdir -p "$MODELS_PATH/vae"
mkdir -p "$MODELS_PATH/diffusion_models"
mkdir -p "$MODELS_PATH/loras"

echo "--- 2. Launching Wan 2.2 Downloads Simultaneously ---"

# Text Encoder (~6.3 GB)
parallel_download "$MODELS_PATH/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors" \
6606028800 &

# VAE (~242 MB)
parallel_download "$MODELS_PATH/vae/wan_2.1_vae.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors" \
253755392 &

# Diffusion Model: High Noise (~13.3 GB)
parallel_download "$MODELS_PATH/diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors" \
13956661248 &

# Diffusion Model: Low Noise (~13.3 GB)
parallel_download "$MODELS_PATH/diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/diffusion_models/wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors" \
13956661248 &

# LoRA: High Noise (~1.1 GB)
parallel_download "$MODELS_PATH/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors" \
1195376640 &

# LoRA: Low Noise (~1.1 GB)
parallel_download "$MODELS_PATH/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors" \
"https://huggingface.co/Comfy-Org/Wan_2.2_ComfyUI_Repackaged/resolve/main/split_files/loras/wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors" \
1195376640 &

echo "--- 3. Waiting for Downloads ---"
echo "⏳ Waiting for all background downloads to finish..."
wait
echo "✅ All downloads finished."
echo "--- Setup Complete ---"