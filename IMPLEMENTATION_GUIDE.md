# OpenAvathar - "Bring Your Own GPU" Frontend Implementation Guide

> **Purpose**: This document provides step-by-step implementation instructions for building the React + Vite frontend. Each task includes detailed steps, important considerations, and pseudo code snippets.

---

## Project Overview

**Goal**: Build a frontend-only React app where users:
1. Enter their RunPod API key
2. Select purpose (Wan 2.2 or InfiniteTalk)
3. Deploy a GPU pod using pre-built templates
4. Upload media and generate AI videos
5. Download the output

**Tech Stack**: React 18, Vite, TypeScript, Zustand, Axios, Framer Motion

**Templates**:
- Wan 2.2: `6au21jp9c9`
- InfiniteTalk: `qvidd7ityi`

---

## Task 1: Project Initialization

### Steps
1. Create new Vite project with React + TypeScript template
2. Install dependencies: `react-router-dom`, `axios`, `zustand`, `lucide-react`, `framer-motion`
3. Create folder structure: `src/{pages,components,services,hooks,stores,types}`
4. Configure path aliases in `vite.config.ts` and `tsconfig.json`

### Important Considerations
- Use npm, not yarn or pnpm for consistency
- Set up absolute imports with `@/` prefix
- Add `.env.example` file documenting required env vars (none for now, but good practice)

### Pseudo Code
```
npx create-vite@latest . --template react-ts
npm install react-router-dom axios zustand lucide-react framer-motion
mkdir -p src/{pages,components/ui,services,hooks,stores,types}
```

---

## Task 2: Design System & Global Styles

### Steps
1. Create `src/index.css` with CSS variables for colors, spacing, typography
2. Use dark theme as default (matches ComfyUI aesthetic)
3. Define utility classes for common patterns
4. Import Google Font "Inter" for modern typography

### Important Considerations
- Use HSL colors for easy theming
- Define gradients for premium look
- Add smooth transitions (0.2s ease) on interactive elements
- Ensure accessibility with sufficient contrast ratios

### Pseudo Code
```css
:root {
  --bg-primary: hsl(222, 47%, 11%);  /* Dark blue-gray */
  --accent: hsl(199, 89%, 48%);       /* Cyan */
  --gradient: linear-gradient(135deg, var(--accent), hsl(280, 80%, 60%));
}
body { background: var(--bg-primary); font-family: 'Inter', sans-serif; }
```

---

## Task 3: TypeScript Interfaces

### Steps
1. Create `src/types/index.ts`
2. Define interfaces for: `Pod`, `PodStatus`, `GPU`, `Volume`, `DeployConfig`
3. Define interfaces for: `ComfyPromptResponse`, `WorkflowConfig`, `GenerationStatus`
4. Define union types for purpose: `'wan2.2' | 'infinitetalk'`

### Important Considerations
- Export all types from a single barrel file
- Use strict types (avoid `any`)
- Match types to actual RunPod GraphQL response shapes

### Pseudo Code
```typescript
interface Pod { id: string; name: string; status: 'RUNNING'|'DEPLOYING'|'STOPPED'; }
interface DeployConfig { templateId: string; gpuType: string; cloudType: 'SECURE'|'COMMUNITY'; }
type Purpose = 'wan2.2' | 'infinitetalk';
```

---

## Task 4: Zustand State Store

### Steps
1. Create `src/stores/appStore.ts`
2. Define state slices: auth, config, pod, generation, logs
3. Add actions: setApiKey, setPurpose, setPodId, addLog, reset
4. Use `persist` middleware only for non-sensitive data (purpose, cloudType)

### Important Considerations
- **NEVER persist apiKey** - security risk
- Keep logs array capped at 1000 lines to prevent memory issues
- Provide a `reset()` action to clear state on logout

### Pseudo Code
```typescript
const useAppStore = create((set) => ({
  apiKey: null,
  purpose: null,
  podId: null,
  setApiKey: (key) => set({ apiKey: key }),
  setPurpose: (p) => set({ purpose: p }),
  addLog: (line) => set((s) => ({ logs: [...s.logs.slice(-999), line] })),
}));
```

---

## Task 5: RunPod API Service

### Steps
1. Create `src/services/runpodApi.ts`
2. Implement GraphQL client using axios POST to `https://api.runpod.io/graphql`
3. Add methods: `validateApiKey()`, `getGpus()`, `deployPod()`, `getPodStatus()`, `terminatePod()`
4. Use template-based deployment (not raw imageId)

### Important Considerations
- Set Authorization header as `Bearer ${apiKey}`
- Handle GraphQL errors in `data.errors` array (not just HTTP errors)
- RunPod uses proxy URLs: `https://{podId}-{port}.proxy.runpod.net`
- For CORS issues, user may need to add a backend proxy later

### Pseudo Code
```typescript
async function graphqlRequest(query: string, variables: object) {
  const res = await axios.post(RUNPOD_URL, { query, variables }, { headers: { Authorization: `Bearer ${apiKey}` }});
  if (res.data.errors) throw new Error(res.data.errors[0].message);
  return res.data.data;
}
async function deployPod(config) { return graphqlRequest(CREATE_POD_MUTATION, { input: config }); }
```

### GraphQL Queries Reference
```graphql
# Validate API key
query { myself { id email } }

# Deploy pod with template
mutation($input: PodFindAndDeployOnDemandInput!) {
  podFindAndDeployOnDemand(input: $input) { id name desiredStatus }
}

# Get pod status
query($podId: String!) {
  pod(input: { podId: $podId }) { id desiredStatus runtime { ports { privatePort publicPort } } }
}

# Terminate pod
mutation($podId: String!) { podTerminate(input: { podId: $podId }) }
```

---

## Task 6: ComfyUI API Service

### Steps
1. Create `src/services/comfyuiApi.ts`
2. Implement file upload to `/upload/image` and `/upload/audio` (multipart/form-data)
3. Implement workflow queue to `/prompt` (POST JSON)
4. Implement status polling via `/history/{promptId}`
5. Implement output fetch from `/view?filename=...&type=output&subfolder=video`

### Important Considerations
- Base URL is dynamic: `https://{podId}-8188.proxy.runpod.net`
- Files upload to "input" folder, videos output to "video" subfolder
- Poll `/history` every 2 seconds until execution complete
- Handle "PENDING", "RUNNING", "COMPLETED", "ERROR" states

### Pseudo Code
```typescript
async function uploadFile(file: File, type: 'image'|'audio') {
  const formData = new FormData(); formData.append(type, file);
  const res = await axios.post(`${baseUrl}/upload/${type}`, formData);
  return res.data.name; // Returns server-side filename
}
async function queueWorkflow(workflow: object) {
  const res = await axios.post(`${baseUrl}/prompt`, { prompt: workflow });
  return res.data.prompt_id;
}
```

---

## Task 7: Workflow Patching Logic

### Steps
1. Create `src/services/workflowPatcher.ts`
2. Load base workflows from `for_ref/API/*.json` (bundle via import)
3. Implement `patchWan22Workflow(imageName, prompt, width, height)`
4. Implement `patchInfiniteTalkWorkflow(imageName, audioName, prompt)`

### Important Considerations
- **Wan 2.2 nodes to patch**:
  - Node `97.inputs.image` → uploaded image filename
  - Node `93.inputs.text` → user prompt
  - Node `98.inputs.width/height` → selected dimensions
- **InfiniteTalk nodes to patch**:
  - Node `313.inputs.image` → uploaded image filename
  - Node `125.inputs.audio` → uploaded audio filename
  - Node `241.inputs.positive_prompt` → user prompt (default: "a person is speaking")

### Pseudo Code
```typescript
function patchWan22(workflow, { imageName, prompt, width, height }) {
  const patched = structuredClone(workflow);
  patched["97"].inputs.image = imageName;
  patched["93"].inputs.text = prompt;
  patched["98"].inputs.width = width;
  patched["98"].inputs.height = height;
  return patched;
}
```

---

## Task 8: Log Streaming Service

### Steps
1. Create `src/services/logStream.ts`
2. Use native `EventSource` API to connect to SSE endpoint
3. Parse incoming `data:` lines and dispatch to store
4. Handle reconnection on error (3 second delay)

### Important Considerations
- Log server runs on port 8001: `https://{podId}-8001.proxy.runpod.net/stream`
- SSE sends heartbeat comments (`: heartbeat`) to keep connection alive
- Clean up EventSource on component unmount to prevent memory leaks

### Pseudo Code
```typescript
function connectLogStream(podId: string, onMessage: (line: string) => void) {
  const url = `https://${podId}-8001.proxy.runpod.net/stream`;
  const source = new EventSource(url);
  source.onmessage = (e) => onMessage(e.data);
  source.onerror = () => { source.close(); setTimeout(() => connectLogStream(podId, onMessage), 3000); };
  return () => source.close();
}
```

---

## Task 9: Landing Page

### Steps
1. Create `src/pages/LandingPage.tsx`
2. Build hero section with gradient background and animated title
3. Add API key input field with eye toggle for visibility
4. Add "Validate & Continue" button that calls `validateApiKey()`
5. On success, navigate to `/setup`

### Important Considerations
- Show loading spinner during validation
- Display clear error message if key is invalid
- Consider adding "What is RunPod?" help link
- Use `useNavigate()` from react-router for navigation

### Pseudo Code
```tsx
function LandingPage() {
  const [apiKey, setApiKey] = useState('');
  const navigate = useNavigate();
  
  async function handleSubmit() {
    const valid = await runpodApi.validateApiKey(apiKey);
    if (valid) { useAppStore.setState({ apiKey }); navigate('/setup'); }
    else { setError('Invalid API key'); }
  }
  
  return <div><input value={apiKey} /><button onClick={handleSubmit}>Continue</button></div>;
}
```

---

## Task 10: Setup Page (Purpose Selection)

### Steps
1. Create `src/pages/SetupPage.tsx`
2. Create radio card selector for purpose (Wan 2.2 vs InfiniteTalk)
3. Create toggle for cloud type (Secure vs Community)
4. Add "Deploy GPU" button that navigates to `/deploy`
5. Show feature descriptions for each purpose

### Important Considerations
- Default to "Secure" cloud (more reliable, slightly more expensive)
- Show estimated cost per hour (~$0.69/hr for RTX 4090)
- Validate that purpose is selected before allowing deploy
- Store selections in Zustand before navigation

### Pseudo Code
```tsx
function SetupPage() {
  const { purpose, setPurpose, cloudType, setCloudType } = useAppStore();
  
  return (
    <div>
      <PurposeCard selected={purpose === 'wan2.2'} onClick={() => setPurpose('wan2.2')} />
      <PurposeCard selected={purpose === 'infinitetalk'} onClick={() => setPurpose('infinitetalk')} />
      <CloudToggle value={cloudType} onChange={setCloudType} />
      <Button disabled={!purpose} onClick={() => navigate('/deploy')}>Deploy GPU</Button>
    </div>
  );
}
```

---

## Task 11: Deploy Page (Pod Management)

### Steps
1. Create `src/pages/DeployPage.tsx`
2. On mount, call `deployPod()` with selected config
3. Poll `getPodStatus()` every 5 seconds until status is "RUNNING"
4. Connect to log stream once pod is running
5. Display ComfyUI link and "Ready" message when ports are available

### Important Considerations
- Show deployment steps: "Creating pod..." → "Starting services..." → "Ready!"
- Calculate ComfyUI URL: `https://{podId}-8188.proxy.runpod.net`
- Log server URL: `https://{podId}-8001.proxy.runpod.net`
- Add "Stop Pod" button with confirmation dialog (prevents accidental billing)
- Handle timeout (300s) with error message

### Pseudo Code
```tsx
useEffect(() => {
  async function deploy() {
    const pod = await runpodApi.deployPod({ templateId, gpuType, cloudType });
    setPodId(pod.id);
    while (true) {
      const status = await runpodApi.getPodStatus(pod.id);
      if (status.desiredStatus === 'RUNNING' && status.runtime) { setReady(true); break; }
      await sleep(5000);
    }
  }
  deploy();
}, []);
```

---

## Task 12: Log Viewer Component

### Steps
1. Create `src/components/LogViewer.tsx`
2. Display scrollable container with mono-spaced font
3. Auto-scroll to bottom on new logs
4. Add "Clear Logs" button
5. Use virtualization if logs exceed 500 lines (optional, for perf)

### Important Considerations
- Style like a terminal (dark background, green/cyan text)
- Add pulsing "Live" indicator when connected
- Show "Disconnected - Reconnecting..." on connection loss
- Truncate very long lines to prevent horizontal scroll

### Pseudo Code
```tsx
function LogViewer({ logs }) {
  const containerRef = useRef();
  useEffect(() => { containerRef.current.scrollTop = containerRef.current.scrollHeight; }, [logs]);
  
  return <div ref={containerRef} className="log-container">{logs.map(l => <div>{l}</div>)}</div>;
}
```

---

## Task 13: Generate Page (Media Upload & Generation)

### Steps
1. Create `src/pages/GeneratePage.tsx`
2. Conditionally render upload fields based on purpose
3. For Wan 2.2: image upload + prompt + dimension selector
4. For InfiniteTalk: image upload + audio upload + prompt
5. On submit: upload files → patch workflow → queue → poll → show result

### Important Considerations
- Validate file types (image: png/jpg/webp, audio: mp3/wav)
- Show file previews before generation
- Disable generate button during processing
- Show progress bar with percentage (estimate based on typical generation time)

### Pseudo Code
```tsx
async function handleGenerate() {
  setStatus('uploading');
  const imageName = await comfyuiApi.uploadImage(imageFile);
  const audioName = purpose === 'infinitetalk' ? await comfyuiApi.uploadAudio(audioFile) : null;
  
  const workflow = purpose === 'wan2.2' 
    ? patchWan22(baseWan22, { imageName, prompt, width, height })
    : patchInfiniteTalk(baseIT, { imageName, audioName, prompt });
  
  setStatus('generating');
  const promptId = await comfyuiApi.queueWorkflow(workflow);
  await pollUntilComplete(promptId);
  setStatus('completed');
}
```

---

## Task 14: Video Preview & Download

### Steps
1. Create `src/components/VideoPreview.tsx`
2. Fetch video blob from ComfyUI `/view` endpoint
3. Create object URL and render in `<video>` tag
4. Add download button using `<a download>` trick

### Important Considerations
- Video outputs to `video/` subfolder in ComfyUI
- Filename format: `ComfyUI_00001.mp4` or `InfiniteTalk/InfiniteTalk_00001.mp4`
- Parse output filename from `/history` response
- Revoke object URL on unmount to prevent memory leaks

### Pseudo Code
```tsx
function VideoPreview({ podId, filename }) {
  const [url, setUrl] = useState('');
  
  useEffect(() => {
    const videoUrl = `https://${podId}-8188.proxy.runpod.net/view?filename=${filename}&type=output&subfolder=video`;
    fetch(videoUrl).then(r => r.blob()).then(blob => setUrl(URL.createObjectURL(blob)));
    return () => URL.revokeObjectURL(url);
  }, [filename]);
  
  return <video src={url} controls />;
}
```

---

## Task 15: Router Setup

### Steps
1. Create `src/App.tsx` with BrowserRouter
2. Define routes: `/` (Landing), `/setup`, `/deploy`, `/generate`
3. Add route guards: redirect to `/` if no API key, redirect to `/deploy` if no pod

### Important Considerations
- Use `<Navigate>` component for redirects
- Wrap routes in layout component for consistent header/footer
- Consider adding `/` → `/generate` redirect if pod already running

### Pseudo Code
```tsx
function App() {
  const { apiKey, podId } = useAppStore();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={apiKey ? <SetupPage /> : <Navigate to="/" />} />
        <Route path="/deploy" element={apiKey ? <DeployPage /> : <Navigate to="/" />} />
        <Route path="/generate" element={podId ? <GeneratePage /> : <Navigate to="/deploy" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Task 16: Error Handling & Loading States

### Steps
1. Create `src/components/ui/Spinner.tsx` and `ErrorMessage.tsx`
2. Add try-catch to all async operations
3. Display user-friendly error messages
4. Add retry buttons for recoverable errors

### Important Considerations
- Common errors: Invalid API key, Pod creation failed, ComfyUI not ready, Generation failed
- Show specific error messages (not just "Something went wrong")
- Log full errors to console for debugging
- Add "Report Issue" link (optional)

### Pseudo Code
```tsx
try {
  await deployPod(config);
} catch (error) {
  if (error.message.includes('No available GPU')) setError('RTX 4090 not available. Try Community Cloud.');
  else if (error.message.includes('Insufficient')) setError('Insufficient RunPod credits.');
  else setError(`Deployment failed: ${error.message}`);
}
```

---

## Reference Files Location

The implementing LLM should reference these files for API structures:

| File                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `for_ref/runpod_orchestrator.py`    | GraphQL queries and mutations for RunPod |
| `for_ref/log_server.py`             | SSE streaming implementation             |
| `for_ref/API/api_img_to_video.json` | Wan 2.2 workflow structure               |
| `for_ref/API/Infinitetalk.json`     | InfiniteTalk workflow structure          |
| `for_ref/Dockerfile`                | Container setup (for debugging issues)   |

---

## Dimension Presets

### Wan 2.2 (api_img_to_video.json)
| Format    | Width | Height | Node to Patch |
| --------- | ----- | ------ | ------------- |
| Landscape | 960   | 512    | `98.inputs`   |
| Portrait  | 512   | 960    | `98.inputs`   |
| Square    | 720   | 720    | `98.inputs`   |

### InfiniteTalk (Infinitetalk.json)
| Format   | Width | Height | Nodes to Patch                         |
| -------- | ----- | ------ | -------------------------------------- |
| Portrait | 480   | 832    | `245.inputs.value`, `246.inputs.value` |

---

## Testing Checklist

After implementing each task, manually verify:

- [ ] Project builds without errors (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] Landing page renders, API key input works
- [ ] Setup page shows purpose cards, selection works
- [ ] Deploy page creates pod (need real API key)
- [ ] Log viewer shows streaming logs
- [ ] Generate page uploads files and queues workflow
- [ ] Video preview plays and download works
- [ ] Stop pod button terminates correctly

---

## Notes for Implementing LLM

1. **Do NOT skip error handling** - Users will face real errors with RunPod
2. **Style everything nicely** - This is a premium tool, not a prototype
3. **Test with real API key** - Many issues only appear with real deployment
4. **Keep code modular** - One component per file, one service per concern
5. **Add console.logs during dev** - Helpful for debugging API issues
