/**
 * Upload Page - Document Processing
 * Simplified bulk processing frontend
 */

import React, { useState } from 'react';
import { SimplifiedDocumentWorkflow } from "@/components/SimplifiedDocumentWorkflow";
import { ModeSelector } from "@/components/bulk-processing/ModeSelector";
import { BulkProcessingHub } from "@/components/bulk-processing/BulkProcessingHub";
import { BulkProcessingDashboardNew } from "@/components/bulk-processing/BulkProcessingDashboardNew";
import { CreateBulkJobWithSources } from "@/components/bulk-processing/CreateBulkJobWithSources";
import { ManualReviewQueue } from "@/components/bulk-processing/ManualReviewQueue";
import { JobDetailsViewNew } from "@/components/bulk-processing/JobDetailsViewNew";
import { DataRenderer } from "@/components/DataRenderer";
import { useDocumentProcessingContext } from '@/contexts/DocumentProcessingContext';
import { useBulkProcessing } from '@/contexts/BulkProcessingContext';

const Upload = () => {
  const {
    state: bulkState,
    setProcessingMode,
    setBulkProcessingView,
    setSelectedJobId
  } = useBulkProcessing();

  const [processedDocument, setProcessedDocument] = useState<Record<string, unknown> | null>(null);
  const { extractedData: globalExtractedData, isEditingData, editedData, setEditedData } = useDocumentProcessingContext();

  // Use state from context
  const processingMode = bulkState.processingMode;
  const bulkProcessingView = bulkState.bulkProcessingView;
  const selectedJobId = bulkState.selectedJobId;

  const handleWorkflowComplete = (result: { documentData: Record<string, unknown>; savedToDatabase: boolean }) => {
    setProcessedDocument(result.documentData);
    console.log('Workflow completed:', result);
  };

  const handleFieldChange = (sectionKey: string, fieldKey: string, value: string) => {
    console.log('🔄 Field change:', { sectionKey, fieldKey, value });
    setEditedData((prev: Record<string, Record<string, string>>) => {
      const newData = { ...prev };
      if (!newData[sectionKey]) {
        newData[sectionKey] = {};
      }
      newData[sectionKey][fieldKey] = value;
      console.log('📊 Updated editedData:', newData);
      return newData;
    });
  };

  // Mode Selection Screen
  if (!processingMode) {
    return <ModeSelector onModeSelect={setProcessingMode} />;
  }

  // Single Document Processing
  if (processingMode === 'single') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="mb-6 max-w-4xl mx-auto px-4">
          <button
            type="button"
            onClick={() => setProcessingMode(null)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            ← Back to Mode Selection
          </button>
        </div>
        <SimplifiedDocumentWorkflow onComplete={handleWorkflowComplete} />

        {/* Results Section - only show when document is processed */}
        {(processedDocument || globalExtractedData) && (
          <section className="py-16 px-4">
            <div className="max-w-5xl mx-auto">
              <div className="mb-8 rounded-lg border border-success/20 bg-success/10 p-6">
                <h2 className="text-xl font-semibold text-success mb-1">Document Processed & Saved</h2>
                <p className="text-muted-foreground">
                  "{(processedDocument || globalExtractedData)?.filename}" has been processed, and {(() => {
                    const data = processedDocument || globalExtractedData;
                    const hierarchicalData = data?.hierarchicalData || data?.hierarchical_data;
                    if (hierarchicalData && typeof hierarchicalData === 'object' && !Array.isArray(hierarchicalData)) {
                      const orderedKeys = hierarchicalData._keyOrder || Object.keys(hierarchicalData).filter(k => !k.startsWith('_'));
                      return orderedKeys.length;
                    }
                    return 0;
                  })()} sections were extracted and saved to the database.
                </p>
              </div>

              {(() => {
                const data = processedDocument || globalExtractedData;
                const hierarchicalData = data?.hierarchicalData || data?.hierarchical_data;

                if (!hierarchicalData || typeof hierarchicalData !== 'object' || Array.isArray(hierarchicalData)) {
                  return null;
                }

                return (
                  <DataRenderer
                    hierarchicalData={hierarchicalData}
                    isEditingData={isEditingData}
                    editedData={editedData}
                    onFieldChange={handleFieldChange}
                  />
                );
              })()}
            </div>
          </section>
        )}
      </div>
    );
  }

  // Bulk Processing Views
  if (processingMode === 'bulk') {
    // Job Details View
    if (selectedJobId) {
      return (
        <JobDetailsViewNew
          jobId={selectedJobId}
          onBack={() => setSelectedJobId(null)}
        />
      );
    }

    // Hub - Main menu for bulk processing
    if (!bulkProcessingView || bulkProcessingView === 'hub') {
      return (
        <BulkProcessingHub
          onNavigateToDashboard={() => setBulkProcessingView('dashboard')}
          onNavigateToReviewQueue={() => setBulkProcessingView('review-queue')}
          onNavigateToCreateJob={() => setBulkProcessingView('wizard')}
          onBack={() => setProcessingMode(null)}
        />
      );
    }

    // Dashboard - Jobs list
    if (bulkProcessingView === 'dashboard') {
      return (
        <BulkProcessingDashboardNew
          onCreateNewJob={() => setBulkProcessingView('wizard')}
          onViewJobDetails={(jobId) => setSelectedJobId(jobId)}
          onBack={() => setBulkProcessingView('hub')}
        />
      );
    }

    // Create Job (Wizard)
    if (bulkProcessingView === 'wizard') {
      return (
        <CreateBulkJobWithSources
          onComplete={(jobId) => {
            setSelectedJobId(jobId);
            setBulkProcessingView('dashboard');
          }}
          onCancel={() => setBulkProcessingView('hub')}
        />
      );
    }

    // Review Queue
    if (bulkProcessingView === 'review-queue') {
      return (
        <div>
          <div className="max-w-7xl mx-auto px-4 pt-8">
            <button
              type="button"
              onClick={() => setBulkProcessingView('hub')}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
            >
              ← Back to Bulk Processing
            </button>
          </div>
          <ManualReviewQueue onBack={() => setBulkProcessingView('hub')} />
        </div>
      );
    }
  }

  // Fallback
  return <ModeSelector onModeSelect={setProcessingMode} />;
};

export default Upload;