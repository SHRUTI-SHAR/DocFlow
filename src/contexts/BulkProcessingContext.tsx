/**
 * BulkProcessingContext
 * Global state management for bulk processing with localStorage persistence
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ProcessingMode, BulkJobConfig } from '@/types/bulk-processing';

interface WizardState {
  step1?: Partial<BulkJobConfig>;
  step2?: Partial<BulkJobConfig>;
}

interface DashboardState {
  searchQuery: string;
  statusFilter: string;
  sortBy: string;
}

interface ReviewQueueState {
  selectedItems: string[];
  errorTypeFilter: string;
  searchQuery: string;
}

interface BulkProcessingState {
  processingMode: ProcessingMode | null;
  bulkProcessingView: 'hub' | 'dashboard' | 'review-queue' | 'wizard' | null;
  selectedJobId: string | null;
  wizardState: WizardState;
  dashboardState: DashboardState;
  reviewQueueState: ReviewQueueState;
}

interface BulkProcessingContextType {
  state: BulkProcessingState;
  setProcessingMode: (mode: ProcessingMode | null) => void;
  setBulkProcessingView: (view: 'hub' | 'dashboard' | 'review-queue' | 'wizard' | null) => void;
  setSelectedJobId: (jobId: string | null) => void;
  setWizardState: (wizardState: WizardState) => void;
  updateWizardStep: (step: 1 | 2, data: Partial<BulkJobConfig>) => void;
  setDashboardState: (state: Partial<DashboardState>) => void;
  setReviewQueueState: (state: Partial<ReviewQueueState>) => void;
  clearWizardState: () => void;
  resetState: () => void;
}

const STORAGE_KEY = 'bulkProcessingState';
const DEFAULT_STATE: BulkProcessingState = {
  processingMode: null,
  bulkProcessingView: null,
  selectedJobId: null,
  wizardState: {},
  dashboardState: {
    searchQuery: '',
    statusFilter: 'all',
    sortBy: 'date'
  },
  reviewQueueState: {
    selectedItems: [],
    errorTypeFilter: 'all',
    searchQuery: ''
  }
};

const BulkProcessingContext = createContext<BulkProcessingContextType | undefined>(undefined);

export const BulkProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BulkProcessingState>(() => {
    // Load from localStorage on initialization
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Merge with defaults to handle new fields
          return { ...DEFAULT_STATE, ...parsed };
        }
      } catch (error) {
        console.error('Failed to load bulk processing state from localStorage:', error);
      }
    }
    return DEFAULT_STATE;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save bulk processing state to localStorage:', error);
      }
    }
  }, [state]);

  const setProcessingMode = useCallback((mode: ProcessingMode | null) => {
    setState(prev => ({ ...prev, processingMode: mode }));
  }, []);

  const setBulkProcessingView = useCallback((view: 'hub' | 'dashboard' | 'review-queue' | 'wizard' | null) => {
    setState(prev => ({ ...prev, bulkProcessingView: view }));
  }, []);

  const setSelectedJobId = useCallback((jobId: string | null) => {
    setState(prev => ({ ...prev, selectedJobId: jobId }));
  }, []);

  const setWizardState = useCallback((wizardState: WizardState) => {
    setState(prev => ({ ...prev, wizardState }));
  }, []);

  const updateWizardStep = useCallback((step: 1 | 2, data: Partial<BulkJobConfig>) => {
    setState(prev => ({
      ...prev,
      wizardState: {
        ...prev.wizardState,
        [`step${step}`]: data
      }
    }));
  }, []);

  const setDashboardState = useCallback((newState: Partial<DashboardState>) => {
    setState(prev => ({
      ...prev,
      dashboardState: { ...prev.dashboardState, ...newState }
    }));
  }, []);

  const setReviewQueueState = useCallback((newState: Partial<ReviewQueueState>) => {
    setState(prev => ({
      ...prev,
      reviewQueueState: { ...prev.reviewQueueState, ...newState }
    }));
  }, []);

  const clearWizardState = useCallback(() => {
    setState(prev => ({ ...prev, wizardState: {} }));
  }, []);

  const resetState = useCallback(() => {
    setState(DEFAULT_STATE);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear bulk processing state from localStorage:', error);
      }
    }
  }, []);

  const value: BulkProcessingContextType = {
    state,
    setProcessingMode,
    setBulkProcessingView,
    setSelectedJobId,
    setWizardState,
    updateWizardStep,
    setDashboardState,
    setReviewQueueState,
    clearWizardState,
    resetState
  };

  return (
    <BulkProcessingContext.Provider value={value}>
      {children}
    </BulkProcessingContext.Provider>
  );
};

export const useBulkProcessing = (): BulkProcessingContextType => {
  const context = useContext(BulkProcessingContext);
  if (context === undefined) {
    throw new Error('useBulkProcessing must be used within a BulkProcessingProvider');
  }
  return context;
};

