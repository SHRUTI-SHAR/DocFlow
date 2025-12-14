/**
 * BulkProcessingWizard Component
 * Main container for the 3-step bulk processing configuration wizard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WizardStepper } from './WizardStepper';
import { SourceConfigurationStep } from './steps/SourceConfigurationStep';
import { ProcessingSettingsStep } from './steps/ProcessingSettingsStep';
import { ReviewStep } from './steps/ReviewStep';
import { useBulkProcessing } from '@/contexts/BulkProcessingContext';
import type { BulkJobConfig } from '@/types/bulk-processing';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface BulkProcessingWizardProps {
  onComplete: (config: BulkJobConfig) => void;
  onCancel: () => void;
  onNavigateToDashboard?: () => void;
}

const WIZARD_STEPS = [
  'Source Configuration',
  'Processing Settings',
  'Review & Start'
];

export const BulkProcessingWizard: React.FC<BulkProcessingWizardProps> = ({
  onComplete,
  onCancel,
  onNavigateToDashboard
}) => {
  const { state, updateWizardStep, clearWizardState } = useBulkProcessing();
  
  // Restore wizard state from context
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<Partial<BulkJobConfig>>(() => {
    // Merge context state with defaults
    const step1Data = state.wizardState.step1 || {};
    const step2Data = state.wizardState.step2 || {};
    return {
      ...step1Data,
      ...step2Data,
      processing: step1Data.processing || {
        mode: 'once',
        batchSize: 10
      },
      processingOptions: step2Data.processingOptions || {
        priority: 3,
        maxRetries: 3,
        enableSignatureDetection: false,
        parallelWorkers: 10,
        retryDelay: 5,
        exponentialBackoff: true,
        sendToReviewAfterMaxRetries: true
      },
      notifications: step2Data.notifications || {
        dashboardNotifications: true,
        completionAlerts: false,
        errorAlerts: false
      }
    };
  });

  const handleStepComplete = (stepData: Partial<BulkJobConfig>) => {
    const updatedConfig = { ...config, ...stepData };
    setConfig(updatedConfig);
    
    // Save to context based on current step
    if (currentStep === 1) {
      updateWizardStep(1, stepData);
    } else if (currentStep === 2) {
      updateWizardStep(2, stepData);
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleFinish = () => {
    // Validate that all required fields are present
    if (!config.source || !config.processing || !config.processingOptions || !config.notifications) {
      // TODO: Show validation error
      return;
    }

    onComplete(config as BulkJobConfig);
    
    // Clear wizard state after successful completion
    clearWizardState();
    
    // Navigate to dashboard after completion
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!config.source;
      case 2:
        return !!config.processingOptions;
      case 3:
        return !!config.source && !!config.processing && !!config.processingOptions;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            ← Back to Mode Selection
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Bulk Processing Configuration</CardTitle>
            <p className="text-muted-foreground mt-2">
              Configure your bulk document processing job in 3 simple steps
            </p>
          </CardHeader>
          <CardContent>
            <WizardStepper
              currentStep={currentStep}
              totalSteps={WIZARD_STEPS.length}
              stepLabels={WIZARD_STEPS}
            />

            <div className="mt-8">
              {currentStep === 1 && (
                <SourceConfigurationStep
                  initialData={state.wizardState.step1 || config}
                  onComplete={(data) => {
                    handleStepComplete(data);
                    handleNext();
                  }}
                />
              )}

              {currentStep === 2 && (
                <ProcessingSettingsStep
                  initialData={state.wizardState.step2 || config}
                  onBack={handleBack}
                  onComplete={(data) => {
                    handleStepComplete(data);
                    handleNext();
                  }}
                />
              )}

              {currentStep === 3 && (
                <ReviewStep
                  config={config as Partial<BulkJobConfig>}
                  onBack={handleBack}
                  onComplete={handleFinish}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

