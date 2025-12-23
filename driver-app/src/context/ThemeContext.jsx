import { createContext, useContext, useState, useEffect } from 'react';
import { getVenueTheme, generateCSSVariables } from '../config/themes';
import { DEFAULT_VENUE } from '../config/api';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [venueId, setVenueId] = useState(() => {
    return localStorage.getItem('venueId') || DEFAULT_VENUE;
  });
  
  const [theme, setTheme] = useState(() => getVenueTheme(venueId));

  // Update theme when venue changes
  useEffect(() => {
    const newTheme = getVenueTheme(venueId);
    setTheme(newTheme);
    localStorage.setItem('venueId', venueId);
    
    // Apply CSS variables to document
    const cssVars = generateCSSVariables(newTheme);
    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [venueId]);

  const switchVenue = (newVenueId) => {
    setVenueId(newVenueId);
  };

  return (
    <ThemeContext.Provider value={{ theme, venueId, switchVenue }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
