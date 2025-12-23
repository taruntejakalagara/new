import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { API_BASE_URL, ENDPOINTS } from './config/api';

// Components
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QueuePage from './pages/QueuePage';
import DriversPage from './pages/DriversPage';
import VehiclesPage from './pages/VehiclesPage';
import HookBoardPage from './pages/HookBoardPage';
import ShiftsPage from './pages/ShiftsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CloseoutPage from './pages/CloseoutPage';
import StationOperationsPage from './pages/StationOperationsPage';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-page">
        <div className="spinner lg" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Main app layout with sidebar
function AppLayout() {
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const fetchQueueCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINTS.QUEUE}`);
        const data = await response.json();
        const pending = data.requests?.filter(r => r.status === 'pending').length || 0;
        setQueueCount(pending);
      } catch (error) {
        console.error('Error fetching queue count:', error);
      }
    };

    fetchQueueCount();
    const interval = setInterval(fetchQueueCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar queueCount={queueCount} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/operations" element={<StationOperationsPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/hooks" element={<HookBoardPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/closeout" element={<CloseoutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
