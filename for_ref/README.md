# Modular ComfyUI Docker Environment

A production-ready Docker image based on `runpod/comfyui` with selective feature installation and real-time web-based log viewing.

## 🎯 Features

- **Modular Installation**: Selectively install Wan 2.1 and/or Wan 2.2 via environment variables
- **Real-time Log Streaming**: Web-based log viewer on port 8001
- **Production Ready**: Comprehensive error handling, health checks, and graceful shutdown
- **Automated CI/CD**: GitHub Actions workflow for automatic builds and publishing to GHCR
- **Optimized Downloads**: Parallel downloads using aria2 with 16 connections

## 📁 Repository Structure

```
.
├── Dockerfile                      # Main Docker image definition
├── entrypoint.sh                   # Master startup script
├── log_server.py                   # Flask-based log streaming server
├── setup_wan.sh                    # Wan 2.2 setup script (pre-tested)
├── setup_parallel.sh               # Wan 2.1 setup script (pre-tested)
├── .github/workflows/publish.yml   # CI/CD automation
├── plans/implementation_plan.md    # Detailed technical documentation
├── TROUBLESHOOTING.md             # Common issues and solutions
└── README.md                       # This file
```

## 🚀 Quick Start

### Local Build and Run

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Build the Docker image
docker build -t comfyui-modular:local .

# Run with all features enabled
docker run -d \
  --name comfyui-full \
  -p 8188:8188 \
  -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1,wan2.2" \
  comfyui-modular:local

# Check logs
docker logs -f comfyui-full
```

### Access Services

- **ComfyUI Interface**: http://localhost:8188
- **Live Log Viewer**: http://localhost:8001
- **Health Check**: http://localhost:8001/health

## 🎛️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_FEATURES` | `""` | Comma-separated list of features to install: `wan2.1`, `wan2.2` |
| `LOG_FILE_PATH` | `/tmp/comfyui.log` | Path to the log file |
| `LOG_SERVER_PORT` | `8001` | Port for the log streaming server |
| `LOG_SERVER_HOST` | `0.0.0.0` | Host for the log streaming server |
| `LOG_SERVER_DEBUG` | `false` | Enable Flask debug mode |

### Feature Options

- **`wan2.1`**: Installs Wan 2.1 with Infinite Talk support
- **`wan2.2`**: Installs Wan 2.2 models
- **Both**: Use `ENABLE_FEATURES="wan2.1,wan2.2"` to install both

### Example Configurations

```bash
# Basic ComfyUI (no additional features)
docker run -d -p 8188:8188 -p 8001:8001 comfyui-modular:local

# Wan 2.1 only
docker run -d -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1" \
  comfyui-modular:local

# Wan 2.2 only
docker run -d -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.2" \
  comfyui-modular:local

# Both features
docker run -d -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1,wan2.2" \
  comfyui-modular:local

# With GPU support (requires nvidia-docker)
docker run -d --gpus all \
  -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1,wan2.2" \
  comfyui-modular:local
```

## 🐳 Using Pre-built Image from GHCR

After pushing to GitHub, the image will be automatically built and published to GitHub Container Registry.

```bash
# Pull and run the latest image
docker run -d \
  -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1,wan2.2" \
  ghcr.io/YOUR_USERNAME/comfyui-modular:latest
```

## ☁️ RunPod Deployment

### Template Configuration

1. **Container Image**: `ghcr.io/YOUR_USERNAME/comfyui-modular:latest`
2. **Container Disk**: 50 GB minimum (models are large)
3. **Exposed HTTP Ports**: `8188, 8001`
4. **Environment Variables**:
   - `ENABLE_FEATURES` = `wan2.1,wan2.2` (or your preferred combination)

### Accessing Services on RunPod

Once deployed, RunPod will provide proxy URLs:

- **ComfyUI**: `https://{pod-id}-8188.proxy.runpod.net`
- **Log Viewer**: `https://{pod-id}-8001.proxy.runpod.net`

### First-Time Setup

When you first start the pod with features enabled:

1. Navigate to the Log Viewer URL to monitor progress
2. Downloads will begin automatically based on `ENABLE_FEATURES`
3. Wait for "Starting ComfyUI" message in logs
4. Access ComfyUI once startup is complete

**Note**: Initial setup with all features can take 15-30 minutes depending on network speed (downloading ~50GB of models).

## 🔧 Development

### Testing Locally

```bash
# Test Flask app standalone
python3 log_server.py

# Test entrypoint script
bash -n entrypoint.sh  # Syntax check
bash entrypoint.sh     # Run (requires ComfyUI environment)

# Build without cache
docker build --no-cache -t comfyui-modular:test .

# Inspect built image
docker run --rm -it --entrypoint /bin/bash comfyui-modular:test
```

### Making Changes

1. **Modify Flask App**: Edit [`log_server.py`](log_server.py)
2. **Modify Startup Logic**: Edit [`entrypoint.sh`](entrypoint.sh)
3. **Add Dependencies**: Update [`Dockerfile`](Dockerfile)
4. **DO NOT MODIFY**: [`setup_wan.sh`](setup_wan.sh) and [`setup_parallel.sh`](setup_parallel.sh) are pre-tested

### GitHub Actions Workflow

The workflow automatically:
- Builds on every push to `main`/`master`
- Builds (but doesn't publish) on pull requests
- Publishes to GHCR with multiple tags: `latest`, `sha-xxxxx`, version tags
- Generates a summary with the image URL

## 📊 Monitoring

### Health Checks

```bash
# Check log server health
curl http://localhost:8001/health

# Expected response:
{
  "status": "healthy",
  "log_file_exists": true,
  "log_file_path": "/tmp/comfyui.log",
  "timestamp": 1706644800.0
}
```

### Container Logs

```bash
# View all logs
docker logs comfyui-full

# Follow logs in real-time
docker logs -f comfyui-full

# View last 100 lines
docker logs --tail 100 comfyui-full
```

### Log Server Status

```bash
# Check if log server is running
docker exec comfyui-full ps aux | grep log_server.py

# View log server output
docker exec comfyui-full cat /tmp/log_server_status.log
```

## 🐛 Troubleshooting

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) for detailed troubleshooting steps.

### Common Issues

| Issue | Solution |
|-------|----------|
| Container exits immediately | Check logs: `docker logs <container>` |
| Log server not accessible | Verify port 8001 is exposed and not blocked |
| Downloads failing | Check network connectivity and disk space |
| ComfyUI not starting | Ensure `/workspace/runpod-slim/ComfyUI` exists in base image |

### Quick Fixes

```bash
# Restart container
docker restart comfyui-full

# Remove and recreate
docker stop comfyui-full && docker rm comfyui-full
docker run -d -p 8188:8188 -p 8001:8001 \
  -e ENABLE_FEATURES="wan2.1" \
  comfyui-modular:local

# Check disk space
docker exec comfyui-full df -h

# Check running processes
docker exec comfyui-full ps aux
```

## 📚 Documentation

- **[Implementation Plan](plans/implementation_plan.md)**: Detailed technical design and architecture
- **[Troubleshooting Guide](TROUBLESHOOTING.md)**: Common issues and solutions
- **[Project Requirements](project_requirements.md)**: Original requirements specification

## 🔒 Security Considerations

- No secrets stored in the image
- Runs with minimal required permissions
- Only necessary ports exposed (8188, 8001)
- Regular security updates via base image
- Health checks for monitoring

## 📝 License

MIT License - See repository for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)
2. Review [`plans/implementation_plan.md`](plans/implementation_plan.md)
3. Open an issue on GitHub

## 🎉 Acknowledgments

- Base image: [runpod/comfyui](https://hub.docker.com/r/runpod/comfyui)
- Setup scripts: Pre-tested and optimized for parallel downloads
- ComfyUI: [ComfyUI Project](https://github.com/comfyanonymous/ComfyUI)
