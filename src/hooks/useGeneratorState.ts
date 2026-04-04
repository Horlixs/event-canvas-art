import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to persist generator page state to localStorage
 * Saves the current URL/state before redirecting for auth
 * and restores it after successful authentication
 */
export const useGeneratorState = () => {
  const location = useLocation();

  // Save current state to localStorage when on generator page
  useEffect(() => {
    if (location.pathname.startsWith('/dp/')) {
      // Store the generator page path so we can restore it after auth
      sessionStorage.setItem('generatorReturnPath', location.pathname);
      sessionStorage.setItem('generatorReturnPathTimestamp', Date.now().toString());
    }
  }, [location.pathname]);

  // Function to retrieve the saved path
  const getSavedGeneratorPath = useCallback((): string | null => {
    const path = sessionStorage.getItem('generatorReturnPath');
    const timestamp = sessionStorage.getItem('generatorReturnPathTimestamp');
    
    // Clear if older than 30 minutes (to avoid stale redirects)
    if (timestamp && Date.now() - parseInt(timestamp) > 30 * 60 * 1000) {
      sessionStorage.removeItem('generatorReturnPath');
      sessionStorage.removeItem('generatorReturnPathTimestamp');
      return null;
    }
    
    return path;
  }, []);

  // Clear saved path
  const clearSavedGeneratorPath = useCallback(() => {
    sessionStorage.removeItem('generatorReturnPath');
    sessionStorage.removeItem('generatorReturnPathTimestamp');
  }, []);

  return {
    getSavedGeneratorPath,
    clearSavedGeneratorPath,
  };
};
