export async function onRequest(context) {
    const { request } = context;

    // Reconstruct the request to RunPod
    const runpodUrl = "https://api.runpod.io/graphql";

    // Clone the request with the new URL
    const newRequest = new Request(runpodUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
    });

    // Fetch from RunPod
    try {
        const response = await fetch(newRequest);

        // Return the response back to the frontend
        return response;
    } catch (err) {
        return new Response(`Proxy Error: ${err.message}`, { status: 500 });
    }
}
