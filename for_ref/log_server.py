#!/usr/bin/env python3
"""
ComfyUI Live Log Streaming Server

A production-ready Flask application for real-time log viewing.
Provides web UI and streaming API for monitoring ComfyUI logs.
"""

import os
import sys
import signal
import logging
import time
from typing import Generator
from flask import Flask, Response, render_template_string, jsonify

# Configuration from environment variables
LOG_FILE: str = os.environ.get('LOG_FILE_PATH', '/tmp/comfyui.log')
PORT: int = int(os.environ.get('LOG_SERVER_PORT', '8001'))
HOST: str = os.environ.get('LOG_SERVER_HOST', '0.0.0.0')
DEBUG: bool = os.environ.get('LOG_SERVER_DEBUG', 'false').lower() == 'true'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# HTML Template (Optimized and styled for real-time streaming)
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>ComfyUI Live Logs</title>
    <style>
        body { 
            background-color: #0f172a; 
            color: #38bdf8; 
            font-family: 'Courier New', Courier, monospace; 
            padding: 20px;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }
        #log-container {
            background-color: #1e293b;
            border-radius: 8px;
            padding: 15px;
            flex-grow: 1;
            overflow-y: auto;
            white-space: pre-wrap;
            border: 1px solid #334155;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        .status {
            color: #4ade80;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
        }
        .status::before {
            content: "";
            display: inline-block;
            width: 8px;
            height: 8px;
            background-color: #4ade80;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 ComfyUI Live Logs</h1>
        <div class="status" id="status-text">Streaming Live</div>
    </div>
    <div id="log-container"></div>

    <script>
        const logContainer = document.getElementById('log-container');
        const statusText = document.getElementById('status-text');
        
        function connectToStream() {
            const evtSource = new EventSource('/stream');
            
            evtSource.onmessage = function(event) {
                logContainer.innerText += event.data;
                logContainer.scrollTop = logContainer.scrollHeight;
            };
            
            evtSource.onerror = function(err) {
                console.error('EventSource failed:', err);
                statusText.innerText = 'Connection Lost - Reconnecting...';
                statusText.style.color = '#f87171';
                evtSource.close();
                setTimeout(connectToStream, 3000); // Retry after 3 seconds
            };
            
            evtSource.onopen = function() {
                statusText.innerText = 'Streaming Live';
                statusText.style.color = '#4ade80';
            };
        }

        connectToStream();
    </script>
</body>
</html>
"""

def ensure_log_file_exists() -> None:
    """Create log file if it doesn't exist."""
    try:
        log_dir = os.path.dirname(LOG_FILE)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        if not os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'w') as f:
                f.write(f"--- [SYSTEM] Waiting for logs at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
            logger.info(f"Created log file: {LOG_FILE}")
    except (IOError, OSError) as e:
        logger.error(f"Failed to create log file: {e}")

@app.route('/')
def index() -> str:
    """Serve the log viewer web interface."""
    return render_template_string(HTML_TEMPLATE)

@app.route('/stream')
def stream() -> Response:
    """Stream log file content in real-time using Server-Sent Events."""
    def generate() -> Generator[str, None, None]:
        try:
            ensure_log_file_exists()
            with open(LOG_FILE, 'r') as f:
                # First, send all existing content line by line
                existing_content = f.read()
                if existing_content:
                    # Send each line separately for proper SSE format
                    for line in existing_content.splitlines(keepends=True):
                        yield f"data: {line}"
                    yield "\n"  # End of initial batch
                
                # Now tail the file for new content
                idle_count = 0
                while True:
                    line = f.readline()
                    if line:
                        yield f"data: {line}\n"
                        idle_count = 0
                    else:
                        time.sleep(0.5)
                        idle_count += 1
                        # Send a heartbeat every 10 seconds to keep connection alive
                        if idle_count >= 20:
                            yield ": heartbeat\n\n"
                            idle_count = 0
        except GeneratorExit:
            logger.info("Client disconnected from stream")
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: --- [ERROR] Stream error: {e} ---\n\n"
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )

@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.route('/health')
def health() -> tuple:
    """Health check endpoint for container orchestration."""
    try:
        log_exists = os.path.exists(LOG_FILE)
        return jsonify({
            'status': 'healthy',
            'log_file_exists': log_exists,
            'log_file_path': LOG_FILE,
            'timestamp': time.time()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

def signal_handler(signum: int, frame) -> None:
    """Handle shutdown signals gracefully."""
    logger.info(f"Received signal {signum}, shutting down...")
    sys.exit(0)

if __name__ == '__main__':
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    logger.info(f"Starting log server on {HOST}:{PORT}")
    logger.info(f"Monitoring log file: {LOG_FILE}")
    
    # In production, threaded=True allows multiple clients to watch the logs
    app.run(host=HOST, port=PORT, threaded=True, debug=DEBUG)
