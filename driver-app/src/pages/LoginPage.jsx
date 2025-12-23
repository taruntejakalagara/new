import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme } = useTheme();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page flex flex-col" style={{ background: 'var(--color-surface)' }}>
      {/* Header with venue branding */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        
        {/* Logo / Brand */}
        <div className="text-center mb-lg fade-in">
          <div 
            className="w-20 h-20 mx-auto mb-md flex items-center justify-center rounded-2xl"
            style={{ background: 'var(--color-primary)' }}
          >
            {theme.logo ? (
              <img src={theme.logo} alt={theme.name} className="w-12 h-12 object-contain" />
            ) : (
              <span className="text-3xl">🔑</span>
            )}
          </div>
          <h1 className="mb-sm">{theme.name}</h1>
          <p>Valet Driver Portal</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card slide-up">
          <h2 className="mb-lg text-center">Start Your Shift</h2>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error mb-md">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="input-group">
            <label className="input-label">Username</label>
            <div className="input-icon-wrapper">
              <User size={20} className="input-icon" />
              <input
                type="text"
                className="input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-icon-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                type="password"
                className="input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn btn-primary btn-lg btn-block"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="text-center mt-lg">
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Need access? Contact your station manager.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center safe-bottom" style={{ paddingTop: 'var(--space-lg)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', opacity: 0.6 }}>
          The Digital Key • Driver v2.0
        </p>
      </div>
    </div>
  );
}
