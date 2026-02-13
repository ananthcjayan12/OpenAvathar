import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getFingerprint } from '@/services/fingerprintService';
import { checkGeneration } from '@/services/licenseService';
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';
import GeneratePage from './pages/GeneratePage';
import DashboardPage from './pages/DashboardPage';
import PodDetailPage from './pages/PodDetailPage';
import DocsPage from './pages/DocsPage';
import DeployPage from './pages/DeployPage';
import SettingsPage from './pages/SettingsPage';
import VideosPage from './pages/VideosPage';
import MainLayout from './components/layout/MainLayout';

function App() {
  const { apiKey, setFingerprint, setUsageStatus, setLicensed, setLicenseKey } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    async function initLicensing() {
      try {
        const fingerprint = await getFingerprint();
        if (cancelled) return;
        setFingerprint(fingerprint);

        const status = await checkGeneration(fingerprint);
        if (cancelled) return;

        setLicensed(!!status.isPro);
        setLicenseKey(status.isPro ? status.licenseKey ?? null : null);
        setUsageStatus({
          canGenerate: status.canGenerate,
          dailyLimit: status.limit ?? 1,
          usedToday: status.used ?? 0,
          resetsIn: status.resetsIn ?? null,
        });
      } catch (err) {
        // Non-fatal: app can still run without licensing; UI will show generic errors when attempting actions.
        console.warn('[Licensing] init failed:', err);
      }
    }

    // Only init once the user is inside the app flow.
    if (apiKey) {
      initLicensing();
    }

    return () => {
      cancelled = true;
    };
  }, [apiKey, setFingerprint, setLicensed, setLicenseKey, setUsageStatus]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Guarded Routes with Layout */}
        <Route
          path="/setup"
          element={
            apiKey ? (
              <MainLayout>
                <SetupPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/pods"
          element={
            apiKey ? (
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/pods/pod/:podId"
          element={
            apiKey ? (
              <MainLayout>
                <PodDetailPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/deploy"
          element={
            apiKey ? (
              <MainLayout>
                <DeployPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/studio"
          element={
            <MainLayout>
              <GeneratePage />
            </MainLayout>
          }
        />
        <Route
          path="/videos"
          element={
            apiKey ? (
              <MainLayout>
                <VideosPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          }
        />
        <Route
          path="/docs"
          element={
            apiKey ? (
              <MainLayout>
                <DocsPage />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Legacy route redirects */}
        <Route path="/generate" element={<Navigate to="/studio" />} />
        <Route path="/dashboard" element={<Navigate to="/pods" />} />
        <Route path="/dashboard/pod/:podId" element={<Navigate to="/pods/pod/:podId" />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
