import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedDriver = localStorage.getItem('driverData');
    if (storedDriver) {
      try {
        setDriver(JSON.parse(storedDriver));
      } catch (e) {
        localStorage.removeItem('driverData');
        localStorage.removeItem('driverId');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/drivers/login`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success) {
      const driverData = data.driver;
      setDriver(driverData);
      localStorage.setItem('driverData', JSON.stringify(driverData));
      localStorage.setItem('driverId', driverData.id);
      
      // Store venue if provided
      if (driverData.venue_id) {
        localStorage.setItem('venueId', driverData.venue_id);
      }
      
      return { success: true, driver: driverData };
    }

    return { success: false, message: data.message || 'Login failed' };
  };

  const logout = async () => {
    const driverId = localStorage.getItem('driverId');
    
    try {
      await fetch(`${API_BASE_URL}/drivers/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });
    } catch (e) {
      console.error('Logout API error:', e);
    }

    setDriver(null);
    localStorage.removeItem('driverData');
    localStorage.removeItem('driverId');
  };

  const isAuthenticated = !!driver;

  return (
    <AuthContext.Provider value={{ driver, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
