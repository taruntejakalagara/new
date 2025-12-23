import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import NFCCheckInPage from './pages/NFCCheckInPage';
import NFCRetrievalPage from './pages/NFCRetrievalPage';
import RetrievalFlowPage from './pages/RetrievalFlowPage';
import TaskQueuePage from './pages/TaskQueuePage';
import PendingHandoverPage from './pages/PendingHandoverPage';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="page flex items-center justify-center">
        <div className="spinner spinner-lg" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="page flex items-center justify-center" style={{ background: 'var(--color-surface)' }}>
        <div className="text-center">
          <div className="spinner spinner-lg mb-md" style={{ color: 'var(--color-accent)' }} />
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      
      {/* Protected */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      
      <Route path="/nfc-checkin" element={
        <ProtectedRoute><NFCCheckInPage /></ProtectedRoute>
      } />
      
      <Route path="/tasks" element={
        <ProtectedRoute><TaskQueuePage /></ProtectedRoute>
      } />
      
      <Route path="/pending-handovers" element={
        <ProtectedRoute><PendingHandoverPage /></ProtectedRoute>
      } />
      
      {/* Placeholder routes - import actual pages */}
      <Route path="/retrieval-flow" element={
        <ProtectedRoute><RetrievalFlowPage /></ProtectedRoute>
      } />
      
      <Route path="/nfc-retrieval" element={
        <ProtectedRoute><NFCRetrievalPage /></ProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
