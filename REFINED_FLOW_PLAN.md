# OpenAvathar Refined Logic: "InfiniteTalk" Focus + Dual-Mode UI

## Executive Summary
Based on the latest stakeholder feedback, we are refining the strategy to focus **exclusively on the InfiniteTalk (Talking Head)** use case. We are removing the Wan 2.2 video generation options to prevent user confusion. Additionally, we are introducing a **"Developer Mode"** toggle. This allows non-tech users to have a seamless experience while retaining full visibility into logs, pod status, and generation details for developers and advanced users.

---

## 1. The Strategy Session (Revisited)

**Participants:**
*   **Sarah (Product Manager)**: "Okay, pivoting. We are now 'OpenAvathar: The Talking Head Studio'. Removing generic video generation simplifies our value prop immensely."
*   **Mike (Lead Dev)**: "We need that visibility though. I can't debug a black box. If a user says 'it's stuck', I need to see the logs. We need a way to toggle the 'Matrix' view on and off."
*   **Alex (UX)**: "Agreed. We can have a global toggle or a 'Show Logs' drawer. The default experience remains clean, but the data is one click away."

### Key Decisions
1.  **Scope Reduction:** Remove "Select Purpose" step. The purpose is hardcoded to `infinitetalk`.
2.  **Visibility:** Maintain all current logging infrastructure but hide it by default behind a "Developer Mode" switch.
3.  **Workflow:** Landing (API Key) -> Auto-Setup (with optional logs) -> Studio (with optional queue debugger).

---

## 2. The New User Journey: "Dual-View" Architecture

### Phase 1: The "Talking Head" Studio
We will streamline the app to be a dedicated tool for creating avatars.

#### Step 1: Landing / Entry
*   **Action:** User enters API Key.
*   **Change:** Instead of asking "What do you want to do?", we immediately present the "InfiniteTalk" Studio entry point.
*   **UI:** "Create Your Avatar Studio". A single primary action button.

#### Step 2: The "Smart" Deploy Page
*   **The Default "Simple" View:**
    *   A friendly loading screen: "Initializing Avatar Engine", "Loading Audio Models".
    *   A visual progress indicator.
*   **The "Developer" Toggle:**
    *   A pill switch in the corner: `[ Simple View | Developer View ]`.
    *   **If Toggled On:** The screen flips (or opens a drawer) to show the **Live Terminal Logs**, Pod ID, GPU specs, and raw connection status (Docker pull commands, etc). This ensures we never lose the ability to see *how* it's working.

#### Step 3: The Studio (Generate Page)
*   **The Default "Simple" View:**
    *   Clean layout: Upload Image (Face) + Upload Audio (Voice) = Video.
    *   Output gallery on the right.
*   **The "Developer" View:**
    *   Reveals the `JobQueuePanel`.
    *   Shows explicit "Pod Status" indicators (Idle/Busy).
    *   Shows ComfyUI API connection health.
    *   Allows "Restart Pod" or advanced debugging actions.

---

## 3. Implementation Plan

### A. Architectural Changes
1.  **Store Update (`appStore.ts`):**
    *   Add `devMode: boolean` to the state.
    *   Hardcode default `purpose` to `'infinitetalk'`.
2.  **Routing Strictness:**
    *   Routes can be simplified since we don't need to support multiple workflow types dynamically.

### B. UI/UX Tasks

#### Task 1: The "Dev Mode" Toggle
*   Create a global component `<DevModeToggle />` placed in the `MainLayout` or top navbar.
*   This toggle controls the visibility of logs and technical details across the entire app.

#### Task 2: Revised `DeployPage.tsx`
*   **Condition:**
    *   `if (!devMode)`: Show `HumanFriendlyLoader` (New component). Shows "Starting server..." instead of `std_out: starting uvicorn`.
    *   `if (devMode)`: Show the existing Terminal/Log view.

#### Task 3: Revised `GeneratePage.tsx`
*   Remove `VideoOrientation` and `MaxFrames` sliders (Auto-calculate based on audio length for InfiniteTalk).
*   **Condition:**
    *   `if (!devMode)`: Hide the `JobQueuePanel` (unless there is an error). Simple "Generate" button.
    *   `if (devMode)`: Show full Queue breakdown, JSON workflow inspection options (future), and detailed status.

#### Task 4: Remove Wan 2.2
*   Delete/Archive `api_img_to_video.json` workflow references from the UI options.
*   Clean up `SetupPage` to remove the selection grid.

---

## 4. Immediate Action Items (Code Checklist)
- [ ] **Search & Destroy**: Remove references to `wan2.2` in `SetupPage.tsx`.
- [ ] **App Store**: Add `isDevMode` state.
- [ ] **Layout**: Add the toggle switch to the Header/Sidebar.
- [ ] **Deploy Page**: Wrap the logs in a conditional render. Add the "Friendly" view.
- [ ] **Generate Page**: Simplify inputs for Audio-only focus.

This plan gives us the **Simplicity** for the illiterate/non-tech user, while keeping the **Transparency** for you (the developer) to monitor the pods effectively.
