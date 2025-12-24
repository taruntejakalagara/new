import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftConfig, setShiftConfig] = useState({
    tipPolicy: 'individual',
    pricingModel: 'flat',
  });

  useEffect(() => {
    const stored = localStorage.getItem('station_manager');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setManager(data.manager);
        setShiftConfig(data.shiftConfig || shiftConfig);
      } catch (e) {
        localStorage.removeItem('station_manager');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password, config = {}) => {
    try {
      const url = API_BASE_URL + ENDPOINTS.LOGIN;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        const sessionData = {
          manager: data.manager,
          shiftConfig: {
            tipPolicy: config.tipPolicy || 'individual',
            pricingModel: config.pricingModel || 'flat',
            ...config,
          },
        };
        
        setManager(data.manager);
        setShiftConfig(sessionData.shiftConfig);
        localStorage.setItem('station_manager', JSON.stringify(sessionData));
        
        return { success: true };
      }

      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  };

  // Direct login with manager data (used when LoginPage already authenticated)
  const loginWithManager = (managerData, config = {}) => {
    const sessionData = {
      manager: managerData,
      shiftConfig: {
        tipPolicy: config.tipPolicy || 'individual',
        pricingModel: config.pricingModel || 'flat',
        ...config,
      },
    };
    
    setManager(managerData);
    setShiftConfig(sessionData.shiftConfig);
    localStorage.setItem('station_manager', JSON.stringify(sessionData));
  };

  const logout = async () => {
    try {
      const url = API_BASE_URL + ENDPOINTS.LOGOUT;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: manager?.id }),
      });
    } catch (e) {
      // Continue with logout even if API fails
    }
    
    setManager(null);
    localStorage.removeItem('station_manager');
  };

  const updateShiftConfig = (updates) => {
    const newConfig = { ...shiftConfig, ...updates };
    setShiftConfig(newConfig);
    
    const stored = localStorage.getItem('station_manager');
    if (stored) {
      const data = JSON.parse(stored);
      data.shiftConfig = newConfig;
      localStorage.setItem('station_manager', JSON.stringify(data));
    }
  };

  return (
    <AuthContext.Provider value={{
      manager,
      isAuthenticated: !!manager,
      loading,
      shiftConfig,
      login,
      loginWithManager,
      logout,
      updateShiftConfig,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}