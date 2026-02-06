/**
 * Service to handle real-time log streaming from the log server on the pod
 */
class LogStreamService {
    private eventSource: EventSource | null = null;
    private reconnectTimeout: number | null = null;

    /**
     * Connects to the SSE log stream on port 8001
     * @param podId Deployed pod ID
     * @param onMessage Callback for each new log line
     * @param onError Optional callback for connection errors
     */
    connect(
        podId: string,
        onMessage: (line: string) => void,
        onError?: (err: any) => void
    ) {
        // RunPod HTTP proxy URL for port 8001 (log server)
        const url = `https://${podId}-8001.proxy.runpod.net/stream`;

        // Close existing connection if any
        this.disconnect();

        try {
            this.eventSource = new EventSource(url);

            this.eventSource.onmessage = (event) => {
                // SSE data comes in event.data
                if (event.data) {
                    onMessage(event.data);
                }
            };

            this.eventSource.onerror = (err) => {
                console.error('Log Stream Error:', err);
                if (onError) onError(err);

                // Attempt to reconnect after 3 seconds
                this.disconnect();
                this.reconnectTimeout = window.setTimeout(() => {
                    this.connect(podId, onMessage, onError);
                }, 3000);
            };

        } catch (error) {
            console.error('Failed to create EventSource:', error);
            if (onError) onError(error);
        }
    }

    /**
     * Closes the connection and clears reconnection timers
     */
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Check if currently connected
     */
    isConnected(): boolean {
        return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
    }
}

export const logStream = new LogStreamService();
