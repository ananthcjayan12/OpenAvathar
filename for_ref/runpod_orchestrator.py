#!/usr/bin/env python3
"""
RunPod Orchestrator for InfiniteTalk
=====================================
Programmatically start/stop GPU pods with persistent storage.

Usage:
    export RUNPOD_API_KEY="your_api_key_here"
    python runpod_orchestrator.py start
    python runpod_orchestrator.py status <pod_id>
    python runpod_orchestrator.py stop <pod_id>
"""

import os
import sys
import json
import requests
from time import sleep

# ============================================
# CONFIGURATION
# ============================================
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY")
RUNPOD_API_URL = "https://api.runpod.io/graphql"

# Your persistent volume name
VOLUME_NAME = "ai-models-storage"

# Pod configuration
POD_CONFIG = {
    "name": "InfiniteTalk-Auto",
    "imageName": "runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04",
    "gpuTypeId": "NVIDIA GeForce RTX 4090",  # RTX 4090 24GB - good for InfiniteTalk
    "gpuCount": 1,
    "volumeInGb": 0,  # Using network volume instead
    "containerDiskInGb": 20,
    "minVcpuCount": 4,
    "minMemoryInGb": 16,
    "ports": "8188/http,22/tcp",
    "dockerArgs": "",
    "env": [],
}

# Boot command - downloads and runs boot script
BOOT_COMMAND = """
cd /workspace && 
curl -sL https://raw.githubusercontent.com/YOUR_REPO/boot_persistent.sh -o boot.sh && 
chmod +x boot.sh && 
./boot.sh
"""

# Alternative: Inline boot command (no external fetch needed)
BOOT_COMMAND_INLINE = """
apt-get update -qq && apt-get install -y -qq ffmpeg libgl1 > /dev/null &
pip install --no-cache-dir torch==2.6.0 torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 > /dev/null 2>&1 &&
pip install --no-cache-dir flash-attn hf_transfer --no-build-isolation > /dev/null 2>&1 &&
cd /workspace/ComfyUI &&
pip install -r requirements.txt > /dev/null 2>&1 &&
find custom_nodes -name "requirements.txt" -exec pip install -r {} \\; > /dev/null 2>&1 &&
wait &&
export COMFY_TRUST_WHEELS_TO_LOAD_ANYTHING=true &&
python main.py --listen --port 8188
"""

# ============================================
# API HELPERS
# ============================================

def graphql_request(query: str, variables: dict = None):
    """Make a GraphQL request to RunPod API."""
    if not RUNPOD_API_KEY:
        print("❌ Error: RUNPOD_API_KEY environment variable not set!")
        print("   Run: export RUNPOD_API_KEY='your_key_here'")
        sys.exit(1)
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {RUNPOD_API_KEY}"
    }
    
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    
    response = requests.post(RUNPOD_API_URL, json=payload, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ API Error: {response.status_code}")
        print(response.text)
        sys.exit(1)
    
    data = response.json()
    if "errors" in data:
        print(f"❌ GraphQL Error: {data['errors']}")
        sys.exit(1)
    
    return data["data"]


def get_volume_id(volume_name: str) -> str:
    """Get volume ID by name."""
    query = """
    query {
        myself {
            networkVolumes {
                id
                name
                size
                dataCenterId
            }
        }
    }
    """
    data = graphql_request(query)
    volumes = data["myself"]["networkVolumes"]
    
    for vol in volumes:
        if vol["name"] == volume_name:
            return vol["id"], vol["dataCenterId"]
    
    print(f"❌ Volume '{volume_name}' not found!")
    print("Available volumes:")
    for vol in volumes:
        print(f"  - {vol['name']} (ID: {vol['id']})")
    sys.exit(1)


def get_available_gpus(data_center_id: str = None):
    """List available GPU types."""
    query = """
    query GpuTypes {
        gpuTypes {
            id
            displayName
            memoryInGb
            secureCloud
            communityCloud
        }
    }
    """
    data = graphql_request(query)
    return data["gpuTypes"]


def check_available_gpus(data_center_id: str = None, min_memory_gb: int = 16):
    """Check which GPUs are currently available in Secure Cloud."""
    # Query for GPU availability with pricing
    query = """
    query GpuTypes {
        gpuTypes {
            id
            displayName
            memoryInGb
            secureCloud
            securePrice
            lowestPrice(input: { gpuCount: 1 }) {
                minimumBidPrice
                uninterruptablePrice
            }
        }
    }
    """
    data = graphql_request(query)
    gpus = data["gpuTypes"]
    
    # Filter for Secure Cloud GPUs with enough memory
    available = []
    for gpu in gpus:
        if gpu.get("secureCloud") and gpu.get("memoryInGb", 0) >= min_memory_gb:
            price_info = gpu.get("lowestPrice") or {}
            available.append({
                "id": gpu["id"],
                "name": gpu["displayName"],
                "memory": gpu["memoryInGb"],
                "price": gpu.get("securePrice") or price_info.get("uninterruptablePrice") or "N/A"
            })
    
    # Sort by memory (descending)
    available.sort(key=lambda x: x["memory"], reverse=True)
    
    return available


# ============================================
# POD MANAGEMENT
# ============================================

def start_pod():
    """Start a new pod with the persistent volume."""
    print("🚀 Starting InfiniteTalk Pod...")
    
    # Get volume ID (datacenter is auto-detected from volume)
    volume_id, data_center_id = get_volume_id(VOLUME_NAME)
    print(f"📦 Found volume: {VOLUME_NAME} (ID: {volume_id})")
    print(f"📍 Data Center: {data_center_id} (auto-detected)")
    
    # Create pod mutation
    query = """
    mutation createPod($input: PodFindAndDeployOnDemandInput!) {
        podFindAndDeployOnDemand(input: $input) {
            id
            name
            desiredStatus
            imageName
            machine {
                podHostId
            }
        }
    }
    """
    
    # Use template for simpler, faster deployment
    variables = {
        "input": {
            "name": POD_CONFIG["name"],
            "templateId": "t2payckvn7",  # Custom InfiniteTalk template
            "gpuTypeId": POD_CONFIG["gpuTypeId"],
            "gpuCount": POD_CONFIG["gpuCount"],
            "networkVolumeId": volume_id,
            "cloudType": "SECURE",
            "volumeMountPath": "/workspace",
        }
    }
    
    data = graphql_request(query, variables)
    pod = data["podFindAndDeployOnDemand"]
    
    print(f"✅ Pod created!")
    print(f"   ID: {pod['id']}")
    print(f"   Name: {pod['name']}")
    print(f"   Status: {pod['desiredStatus']}")
    
    # Wait for pod to be ready
    print("\n⏳ Waiting for pod to be ready...")
    pod_info = wait_for_pod(pod['id'])
    
    return pod_info


def get_pod_status(pod_id: str):
    """Get detailed pod status."""
    query = """
    query Pod($podId: String!) {
        pod(input: { podId: $podId }) {
            id
            name
            desiredStatus
            lastStatusChange
            imageName
            runtime {
                uptimeInSeconds
                ports {
                    ip
                    isIpPublic
                    privatePort
                    publicPort
                    type
                }
            }
        }
    }
    """
    
    data = graphql_request(query, {"podId": pod_id})
    return data["pod"]


def wait_for_pod(pod_id: str, timeout: int = 300):
    """Wait for pod to be ready and return connection info."""
    elapsed = 0
    interval = 10
    
    while elapsed < timeout:
        pod = get_pod_status(pod_id)
        
        if pod is None:
            print(f"❌ Pod {pod_id} not found!")
            sys.exit(1)
        
        status = pod.get("desiredStatus", "UNKNOWN")
        runtime = pod.get("runtime")
        
        if status == "RUNNING" and runtime:
            ports = runtime.get("ports") or []
            ssh_port = None
            
            for p in ports:
                if p["privatePort"] == 22 and p.get("isIpPublic"):
                    ssh_port = p
            
            # RunPod uses proxy URLs for HTTP services
            proxy_url = f"https://{pod_id}-8188.proxy.runpod.net"
            
            print(f"\n✅ Pod is READY!")
            print(f"   🌐 ComfyUI: {proxy_url}")
            if ssh_port:
                print(f"   🔑 SSH: ssh root@{ssh_port['ip']} -p {ssh_port['publicPort']}")
            print(f"   ⏱️  Uptime: {runtime['uptimeInSeconds']}s")
            print(f"\n⚠️  Note: ComfyUI may take 1-2 minutes to fully start.")
            return pod
        
        print(f"   Status: {status} (waiting... {elapsed}s)")
        sleep(interval)
        elapsed += interval
    
    print(f"❌ Timeout waiting for pod to be ready")
    sys.exit(1)


def stop_pod(pod_id: str):
    """Stop and terminate a pod."""
    print(f"🛑 Stopping pod {pod_id}...")
    
    query = """
    mutation terminatePod($podId: String!) {
        podTerminate(input: { podId: $podId })
    }
    """
    
    data = graphql_request(query, {"podId": pod_id})
    print(f"✅ Pod terminated!")
    return data


def list_pods():
    """List all your pods."""
    query = """
    query {
        myself {
            pods {
                id
                name
                desiredStatus
                imageName
                runtime {
                    uptimeInSeconds
                }
            }
        }
    }
    """
    
    data = graphql_request(query)
    pods = data["myself"]["pods"]
    
    print(f"📋 Your Pods ({len(pods)}):")
    for pod in pods:
        uptime = pod.get("runtime", {}).get("uptimeInSeconds", 0) if pod.get("runtime") else 0
        print(f"   - {pod['name']} ({pod['id']})")
        print(f"     Status: {pod['desiredStatus']}, Uptime: {uptime}s")
    
    return pods


# ============================================
# CLI
# ============================================

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python runpod_orchestrator.py start          - Start a new pod")
        print("  python runpod_orchestrator.py status <id>    - Get pod status")
        print("  python runpod_orchestrator.py stop <id>      - Stop a pod")
        print("  python runpod_orchestrator.py list           - List all pods")
        print("  python runpod_orchestrator.py volumes        - List volumes")
        print("  python runpod_orchestrator.py gpus           - List available GPUs (Secure Cloud)")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "start":
        start_pod()
    
    elif command == "status":
        if len(sys.argv) < 3:
            print("❌ Please provide pod ID")
            sys.exit(1)
        pod = get_pod_status(sys.argv[2])
        print(json.dumps(pod, indent=2))
    
    elif command == "stop":
        if len(sys.argv) < 3:
            print("❌ Please provide pod ID")
            sys.exit(1)
        stop_pod(sys.argv[2])
    
    elif command == "list":
        list_pods()
    
    elif command == "volumes":
        query = """
        query {
            myself {
                networkVolumes {
                    id
                    name
                    size
                    dataCenterId
                }
            }
        }
        """
        data = graphql_request(query)
        volumes = data["myself"]["networkVolumes"]
        print(f"📦 Your Volumes ({len(volumes)}):")
        for vol in volumes:
            print(f"   - {vol['name']} (ID: {vol['id']}, Size: {vol['size']}GB, DC: {vol['dataCenterId']})")
    
    elif command == "gpus":
        print("🔍 Checking available GPUs (Secure Cloud, ≥16GB VRAM)...")
        gpus = check_available_gpus(min_memory_gb=16)
        print(f"\n🎮 Available GPUs ({len(gpus)}):")
        print(f"{'GPU ID':<35} {'Name':<20} {'VRAM':<10} {'Price/hr':<10}")
        print("-" * 75)
        for gpu in gpus:
            price = f"${gpu['price']:.2f}" if isinstance(gpu['price'], (int, float)) else gpu['price']
            print(f"{gpu['id']:<35} {gpu['name']:<20} {gpu['memory']}GB{'':<6} {price:<10}")
    
    else:
        print(f"❌ Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
