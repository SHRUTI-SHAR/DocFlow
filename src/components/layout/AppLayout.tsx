import React, { useEffect } from 'react';
import { Navigation } from '@/components/Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * AppLayout component that provides the main application layout structure
 * 
 * Includes navigation and main content area
 * Used for all authenticated pages
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  // Prevent body/html from scrolling - only main element should scroll
  // Use requestAnimationFrame to ensure DOM is ready before preventing scroll
  useEffect(() => {
    const preventBodyScroll = () => {
      // Lock body and html to viewport height, prevent scrolling
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.height = '100vh';
      document.body.style.overflow = 'hidden';
      document.body.style.overflowY = 'hidden';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    };
    
    // Use requestAnimationFrame to ensure content is rendered first
    const rafId = requestAnimationFrame(() => {
      // Then delay slightly to ensure height calculation
      setTimeout(preventBodyScroll, 10);
    });
    
    // Also ensure it's set after a longer delay for slower renders
    const timeoutId = setTimeout(preventBodyScroll, 200);
    
    // Prevent on visibility change (tab switch/back button/minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestAnimationFrame(() => {
          setTimeout(preventBodyScroll, 10);
        });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Restore on unmount (for dialogs that need body scroll)
      document.documentElement.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navigation />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};