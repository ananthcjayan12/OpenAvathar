import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';
import DeployPage from './pages/DeployPage';
import GeneratePage from './pages/GeneratePage';

function App() {
  const { apiKey, podId } = useAppStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Guarded Routes */}
        <Route
          path="/setup"
          element={apiKey ? <SetupPage /> : <Navigate to="/" />}
        />
        <Route
          path="/deploy"
          element={apiKey ? <DeployPage /> : <Navigate to="/" />}
        />
        <Route
          path="/generate"
          element={podId ? <GeneratePage /> : <Navigate to="/deploy" />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
