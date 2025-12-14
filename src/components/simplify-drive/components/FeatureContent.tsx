import React from 'react';

// Feature Dashboards
import { ShareLinksDashboard } from '@/components/sharing/ShareLinksDashboard';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { RetentionDashboard } from '@/components/retention/RetentionDashboard';
import { LegalHoldDashboard } from '@/components/legal-hold/LegalHoldDashboard';
import { SignatureDashboard } from '@/components/signatures/SignatureDashboard';
import { CheckInOutDashboard } from '@/components/checkinout/CheckInOutDashboard';
import { WorkflowDashboard } from '@/components/workflows/WorkflowDashboard';
import { WorkflowAnalyticsDashboard } from '@/components/workflows/WorkflowAnalyticsDashboard';
import AuditDashboard from '@/components/audit/AuditDashboard';
import { ComparisonDashboard } from '@/components/document-comparison';
import { SummaryDashboard } from '@/components/document-summary';
import { FavoritesDashboard } from '@/components/favorites';
import { QuickAccessPanel } from '@/components/quick-access';
import { PendingTransfersPanel } from '@/components/ownership';
import { CustomMetadataManager } from '@/components/metadata';
import { WatermarkEditor } from '@/components/watermark';
import { ExternalSharingPanel } from '@/components/external-sharing';
import { ContentAccessRulesPanel } from '@/components/content-rules';
import { ProcessingQueuePanel } from '@/components/scalable';
import { MigrationDashboard } from '@/components/migration';

import type { Document } from '../types';

interface FeatureContentProps {
  activeFeature: string;
  documents: Document[];
  onViewDocument: (doc: Document) => void;
  onDownloadDocument: (doc: Document) => void;
}

export function FeatureContent({ 
  activeFeature, 
  documents,
  onViewDocument,
  onDownloadDocument,
}: FeatureContentProps) {
  // Map documents to simpler format for components
  const simpleDocuments = documents.map(d => ({
    id: d.id,
    file_name: d.file_name,
    file_type: d.file_type,
    file_size: d.file_size,
    created_at: d.created_at,
    storage_url: d.storage_url,
  }));

  switch (activeFeature) {
    case 'quickaccess':
      return (
        <QuickAccessPanel 
          documents={simpleDocuments}
          onViewDocument={(doc) => {
            const fullDoc = documents.find(d => d.id === doc.id);
            if (fullDoc) onViewDocument(fullDoc);
          }}
          onDownloadDocument={(doc) => {
            const fullDoc = documents.find(d => d.id === doc.id);
            if (fullDoc) onDownloadDocument(fullDoc);
          }}
        />
      );

    case 'favorites':
      return (
        <FavoritesDashboard 
          documents={simpleDocuments}
          onViewDocument={(id) => {
            const doc = documents.find(d => d.id === id);
            if (doc) onViewDocument(doc);
          }}
          onDownloadDocument={(id) => {
            const doc = documents.find(d => d.id === id);
            if (doc) onDownloadDocument(doc);
          }}
        />
      );

    case 'summaries':
      return (
        <SummaryDashboard 
          documents={documents.map(d => ({
            id: d.id,
            file_name: d.file_name,
            file_type: d.file_type,
            created_at: d.created_at,
            extracted_text: d.extracted_text,
            processing_status: d.processing_status,
          }))} 
        />
      );

    case 'compare':
      return (
        <ComparisonDashboard 
          documents={documents.map(d => ({
            id: d.id,
            file_name: d.file_name,
            file_type: d.file_type,
            created_at: d.created_at,
            updated_at: d.updated_at,
          }))} 
        />
      );

    case 'externalsharing':
      return <ExternalSharingPanel documents={simpleDocuments.map(d => ({ id: d.id, file_name: d.file_name }))} />;

    case 'contentrules':
      return <ContentAccessRulesPanel />;

    case 'metadata':
      return <CustomMetadataManager />;

    case 'watermarks':
      return <WatermarkEditor />;

    case 'transfers':
      return <PendingTransfersPanel />;

    case 'sharing':
      return <ShareLinksDashboard />;

    case 'checkinout':
      return <CheckInOutDashboard />;

    case 'workflows':
      return <WorkflowDashboard />;

    case 'analytics':
      return <WorkflowAnalyticsDashboard />;

    case 'signatures':
      return <SignatureDashboard />;

    case 'compliance':
      return <ComplianceDashboard />;

    case 'retention':
      return <RetentionDashboard />;

    case 'legalhold':
      return <LegalHoldDashboard />;

    case 'audit':
      return <AuditDashboard title="SimplifyDrive Audit Trail" showStats={true} />;

    case 'pipeline':
      return <ProcessingQueuePanel />;

    case 'migration':
      return <MigrationDashboard />;

    default:
      return null;
  }
}
