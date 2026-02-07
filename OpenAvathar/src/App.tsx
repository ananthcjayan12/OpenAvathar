import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';
import GeneratePage from './pages/GeneratePage';
import DashboardPage from './pages/DashboardPage';
import PodDetailPage from './pages/PodDetailPage';
import DocsPage from './pages/DocsPage';
import DeployPage from './pages/DeployPage';
import MainLayout from './components/layout/MainLayout';

function App() {
  const { apiKey, activePodId } = useAppStore();

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
          path="/dashboard"
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
          path="/dashboard/pod/:podId"
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
          path="/generate"
          element={
            activePodId ? (
              <MainLayout>
                <GeneratePage />
              </MainLayout>
            ) : (
              <Navigate to="/deploy" />
            )
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

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
