#!/bin/bash
# =============================================================================
# ComfyUI Modular Entrypoint Script
# =============================================================================
# Handles feature-based initialization and service startup
# =============================================================================

# Don't use 'set -e' as it's too strict and causes container restarts on minor errors

# Configuration
LOG_FILE="${LOG_FILE_PATH:-/tmp/comfyui.log}"
COMFY_PATH="/workspace/runpod-slim/ComfyUI"
LOG_SERVER_PORT="${LOG_SERVER_PORT:-8001}"

# Ensure ComfyUI path exists before proceeding
if [ ! -d "$COMFY_PATH" ]; then
    echo "--- [SYSTEM] ComfyUI missing, cloning to $COMFY_PATH ---" | tee -a "$LOG_FILE"
    mkdir -p "$(dirname "$COMFY_PATH")"
    git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFY_PATH"
    cd "$COMFY_PATH"
    pip install --no-cache-dir -r requirements.txt
fi

# Initialize log file
# We use 'tee' to both write to the log file and show in stdout for container logs
echo "--- [SYSTEM] Container Started at $(date -Iseconds) ---" | tee "$LOG_FILE"
echo "--- [SYSTEM] Features Enabled: ${ENABLE_FEATURES:-none} ---" | tee -a "$LOG_FILE"

# Start the Live Log Server in the background
echo "--- [SYSTEM] Starting Log Server on port $LOG_SERVER_PORT ---" | tee -a "$LOG_FILE"
python3 /app/log_server.py > /tmp/log_server_status.log 2>&1 &
LOG_SERVER_PID=$!
echo "--- [SYSTEM] Log Server PID: $LOG_SERVER_PID ---" | tee -a "$LOG_FILE"

# Give the log server a moment to initialize
sleep 2

# Conditional Feature Execution
# We use lowercase for the check to be case-insensitive
FEATURES_LOWER=$(echo "$ENABLE_FEATURES" | tr '[:upper:]' '[:lower:]')

if [[ "$FEATURES_LOWER" == *"wan2.1"* ]]; then
    echo "--- [PROCESS] Starting Wan 2.1 Setup ---" | tee -a "$LOG_FILE"
    # Execute setup_parallel.sh and append output to log file
    bash /app/setup_parallel.sh >> "$LOG_FILE" 2>&1 || {
        echo "--- [ERROR] Wan 2.1 setup failed ---" | tee -a "$LOG_FILE"
    }
    echo "--- [PROCESS] Wan 2.1 Setup Complete ---" | tee -a "$LOG_FILE"
fi

if [[ "$FEATURES_LOWER" == *"wan2.2"* ]]; then
    echo "--- [PROCESS] Starting Wan 2.2 Setup ---" | tee -a "$LOG_FILE"
    # Execute setup_wan.sh and append output to log file
    bash /app/setup_wan.sh >> "$LOG_FILE" 2>&1 || {
        echo "--- [ERROR] Wan 2.2 setup failed ---" | tee -a "$LOG_FILE"
    }
    echo "--- [PROCESS] Wan 2.2 Setup Complete ---" | tee -a "$LOG_FILE"
fi

# Ensure all background processes from setup scripts are handled
# The setup scripts might have started ComfyUI, but the requirement says 
# to start it only once after all downloads finish.
# pkill helps ensure we don't have duplicate instances if the scripts behaved differently.
pkill -f "python3 main.py" || true
sleep 2

# Start ComfyUI (Only once, after all downloads finish)
echo "--- [SYSTEM] Starting ComfyUI ---" | tee -a "$LOG_FILE"
if [ -d "$COMFY_PATH" ]; then
    cd "$COMFY_PATH"
    # Use 'exec' so python becomes PID 1 and receives signals correctly
    # --enable-cors-header allows browser uploads from different origins
    exec python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header >> "$LOG_FILE" 2>&1
else
    echo "--- [ERROR] ComfyUI directory not found at $COMFY_PATH ---" | tee -a "$LOG_FILE"
    exit 1
fi
