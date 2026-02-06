import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import LandingPage from './pages/LandingPage';
import SetupPage from './pages/SetupPage';

// Placeholder components for guarded routes
const DeployPlaceholder = () => <div className="container">Deploy Page (Coming Soon)</div>;
const GeneratePlaceholder = () => <div className="container">Generate Page (Coming Soon)</div>;

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
          element={apiKey ? <DeployPlaceholder /> : <Navigate to="/" />}
        />
        <Route
          path="/generate"
          element={podId ? <GeneratePlaceholder /> : <Navigate to="/deploy" />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
