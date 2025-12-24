import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VenuesPage from './pages/VenuesPage';
import VenueDetailPage from './pages/VenueDetailPage';

// Developer Tools
import SystemHealthPage from './pages/SystemHealthPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import ErrorLogsPage from './pages/ErrorLogsPage';
import DatabaseExplorerPage from './pages/DatabaseExplorerPage';
import DebugToolsPage from './pages/DebugToolsPage';

// Protected Route
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
      }}>
        <div className="spinner" style={{ 
          width: 40, height: 40, 
          border: '3px solid rgba(255,255,255,0.2)', 
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// App Layout with Sidebar
function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Main */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/venues" element={<VenuesPage />} />
          <Route path="/venues/:id" element={<VenueDetailPage />} />
          
          {/* Developer Tools */}
          <Route path="/system-health" element={<SystemHealthPage />} />
          <Route path="/activity" element={<ActivityFeedPage />} />
          <Route path="/errors" element={<ErrorLogsPage />} />
          <Route path="/database" element={<DatabaseExplorerPage />} />
          <Route path="/debug" element={<DebugToolsPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
          background: #f1f5f9;
        }

        .main-content {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// App Routes
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

// Main App
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
