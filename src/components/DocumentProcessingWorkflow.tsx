import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, AlertCircle, Upload, Search, FileText, CheckSquare } from 'lucide-react';
import { ProcessingSteps, DocumentData, WorkflowInstance } from '@/types/workflow';
import { CombinedCaptureStep } from './workflow-steps/CombinedCaptureStep';
import { UnderstandStep } from './workflow-steps/UnderstandStep';
import { CombinedProcessStep } from './workflow-steps/CombinedProcessStep';
import { CombinedFinalizeStep } from './workflow-steps/CombinedFinalizeStep';
import { useDocumentProcessingContext } from '@/contexts/DocumentProcessingContext';

interface DocumentProcessingWorkflowProps {
  onComplete?: (result: any) => void;
}

const stepConfig = [
  { key: 'capture', title: 'Capture', icon: Upload, description: 'Scan or upload any document with smart preprocessing' },
  { key: 'understand', title: 'Understand', icon: Search, description: 'AI-powered OCR and layout detection with field extraction' },
  { key: 'process', title: 'Process', icon: FileText, description: 'Dynamic form generation with validation and routing' },
  { key: 'finalize', title: 'Finalize', icon: CheckSquare, description: 'Approval workflows with audit trails and export' },
];

export const DocumentProcessingWorkflow: React.FC<DocumentProcessingWorkflowProps> = ({ onComplete }) => {
  const {
    currentStep,
    processingSteps,
    documentData,
    workflowInstance,
    setCurrentStep,
    setDocumentData,
    setWorkflowInstance,
    updateStepStatus,
    moveToNextStep,
    resetAll
  } = useDocumentProcessingContext();

  const getStepIcon = (step: keyof ProcessingSteps, index: number) => {
    const IconComponent = stepConfig[index].icon;
    const status = processingSteps[step];
    
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-success" />;
    if (status === 'processing') return <Clock className="w-5 h-5 text-warning animate-spin" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-destructive" />;
    return <IconComponent className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: ProcessingSteps[keyof ProcessingSteps]) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      error: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status]} className={
        status === 'completed' ? 'bg-success text-success-foreground' :
        status === 'processing' ? 'bg-warning text-warning-foreground' : ''
      }>
        {status}
      </Badge>
    );
  };

  const calculateProgress = () => {
    const completedSteps = Object.values(processingSteps).filter(status => status === 'completed').length;
    return (completedSteps / Object.keys(processingSteps).length) * 100;
  };

  const renderCurrentStepContent = () => {
    const stepKey = stepConfig[currentStep]?.key as keyof ProcessingSteps;
    
    switch (stepKey) {
      case 'capture':
        return (
          <CombinedCaptureStep
            onComplete={(data) => {
              setDocumentData(data);
              updateStepStatus('capture', 'completed');
              moveToNextStep();
            }}
            onError={() => updateStepStatus('capture', 'error')}
          />
        );
      case 'understand':
        return (
          <UnderstandStep
            documentData={documentData}
            onComplete={(data) => {
              setDocumentData(data);
              updateStepStatus('understand', 'completed');
              moveToNextStep();
            }}
            onError={() => updateStepStatus('understand', 'error')}
          />
        );
      case 'process':
        return (
          <CombinedProcessStep
            documentData={documentData}
            onComplete={(data) => {
              setDocumentData(data);
              updateStepStatus('process', 'completed');
              moveToNextStep();
            }}
            onError={() => updateStepStatus('process', 'error')}
          />
        );
      case 'finalize':
        return (
          <CombinedFinalizeStep
            documentData={documentData}
            workflowInstance={workflowInstance}
            onComplete={(result) => {
              updateStepStatus('finalize', 'completed');
              onComplete?.(result);
            }}
            onError={() => updateStepStatus('finalize', 'error')}
          />
        );
      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Processing Workflow
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetAll}
            >
              Reset Workflow
            </Button>
          </div>
          <Progress value={calculateProgress()} className="w-full" />
          <p className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {stepConfig.length}: {stepConfig[currentStep]?.title}
          </p>
        </CardHeader>
      </Card>

      {/* Steps Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stepConfig.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center text-center h-full">
                <div className={`p-3 rounded-full border-2 mb-2 ${
                  index === currentStep ? 'border-primary bg-primary/10' : 
                  processingSteps[step.key as keyof ProcessingSteps] === 'completed' ? 'border-success bg-success/10' :
                  'border-border bg-background'
                }`}>
                  {getStepIcon(step.key as keyof ProcessingSteps, index)}
                </div>
                <div className="flex flex-col items-center justify-between h-full space-y-2">
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="mt-auto">
                    {getStatusBadge(processingSteps[step.key as keyof ProcessingSteps])}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{stepConfig[currentStep]?.title}</CardTitle>
          <p className="text-muted-foreground">{stepConfig[currentStep]?.description}</p>
        </CardHeader>
        <CardContent>
          {renderCurrentStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          Previous Step
        </Button>
        <Button
          onClick={() => setCurrentStep(prev => Math.min(stepConfig.length - 1, prev + 1))}
          disabled={currentStep === stepConfig.length - 1}
        >
          Next Step
        </Button>
      </div>
    </div>
  );
};