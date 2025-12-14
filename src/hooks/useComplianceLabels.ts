import { useState, useCallback } from 'react';
import { 
  ComplianceLabel, 
  DocumentComplianceLabel, 
  ComplianceAuditEntry,
  ComplianceViolation,
  ComplianceStats,
  ComplianceFramework,
  DataClassification,
  SensitivityLevel,
  DataCategory
} from '@/types/compliance';
import { toast } from 'sonner';

// Mock data for development
const mockLabels: ComplianceLabel[] = [
  {
    id: '1',
    name: 'GDPR Personal Data',
    code: 'GDPR-PD',
    framework: 'GDPR',
    description: 'Contains personal data subject to GDPR regulations',
    color: '#3B82F6',
    icon: 'Shield',
    data_classification: 'confidential',
    sensitivity_level: 'high',
    data_categories: ['pii', 'customer_data'],
    retention_required: true,
    retention_period_days: 2555,
    encryption_required: true,
    access_logging_required: true,
    watermark_required: false,
    download_restricted: false,
    sharing_restricted: true,
    export_restricted: false,
    deletion_requires_approval: true,
    geo_restrictions: ['EU', 'EEA'],
    audit_frequency_days: 90,
    requires_acknowledgment: true,
    acknowledgment_text: 'I acknowledge that this document contains personal data protected under GDPR.',
    is_system_label: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'HIPAA PHI',
    code: 'HIPAA-PHI',
    framework: 'HIPAA',
    description: 'Protected Health Information under HIPAA',
    color: '#EF4444',
    icon: 'Heart',
    data_classification: 'restricted',
    sensitivity_level: 'critical',
    data_categories: ['phi'],
    retention_required: true,
    retention_period_days: 2190,
    encryption_required: true,
    access_logging_required: true,
    watermark_required: true,
    download_restricted: true,
    sharing_restricted: true,
    export_restricted: true,
    deletion_requires_approval: true,
    audit_frequency_days: 30,
    requires_acknowledgment: true,
    acknowledgment_text: 'I acknowledge that this document contains PHI and I am authorized to access it.',
    is_system_label: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'PCI Cardholder Data',
    code: 'PCI-CHD',
    framework: 'PCI_DSS',
    description: 'Payment card and cardholder data',
    color: '#22C55E',
    icon: 'CreditCard',
    data_classification: 'restricted',
    sensitivity_level: 'critical',
    data_categories: ['pci', 'financial'],
    retention_required: true,
    retention_period_days: 365,
    encryption_required: true,
    access_logging_required: true,
    watermark_required: true,
    download_restricted: true,
    sharing_restricted: true,
    export_restricted: true,
    deletion_requires_approval: true,
    audit_frequency_days: 30,
    requires_acknowledgment: true,
    acknowledgment_text: 'I acknowledge that this document contains payment card data.',
    is_system_label: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'SOX Financial Records',
    code: 'SOX-FR',
    framework: 'SOX',
    description: 'Financial records subject to Sarbanes-Oxley',
    color: '#A855F7',
    icon: 'Building2',
    data_classification: 'highly_confidential',
    sensitivity_level: 'high',
    data_categories: ['financial', 'legal'],
    retention_required: true,
    retention_period_days: 2555,
    encryption_required: true,
    access_logging_required: true,
    watermark_required: false,
    download_restricted: false,
    sharing_restricted: true,
    export_restricted: false,
    deletion_requires_approval: true,
    audit_frequency_days: 90,
    requires_acknowledgment: false,
    is_system_label: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Internal Use Only',
    code: 'INT-001',
    framework: 'CUSTOM',
    description: 'For internal company use only',
    color: '#6B7280',
    icon: 'Lock',
    data_classification: 'internal',
    sensitivity_level: 'medium',
    data_categories: ['other'],
    retention_required: false,
    encryption_required: false,
    access_logging_required: true,
    watermark_required: false,
    download_restricted: false,
    sharing_restricted: true,
    export_restricted: false,
    deletion_requires_approval: false,
    audit_frequency_days: 365,
    requires_acknowledgment: false,
    is_system_label: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockAuditEntries: ComplianceAuditEntry[] = [
  {
    id: '1',
    document_id: 'doc-1',
    label_id: '1',
    action: 'applied',
    performed_by: 'John Doe',
    performed_at: new Date(Date.now() - 86400000).toISOString(),
    details: 'Applied GDPR Personal Data label to document'
  },
  {
    id: '2',
    document_id: 'doc-2',
    label_id: '2',
    action: 'acknowledged',
    performed_by: 'Jane Smith',
    performed_at: new Date(Date.now() - 43200000).toISOString(),
    details: 'Acknowledged HIPAA PHI compliance requirements'
  },
  {
    id: '3',
    document_id: 'doc-3',
    label_id: '3',
    action: 'violation',
    performed_by: 'System',
    performed_at: new Date(Date.now() - 3600000).toISOString(),
    details: 'Unauthorized access attempt detected'
  }
];

const mockViolations: ComplianceViolation[] = [
  {
    id: '1',
    document_id: 'doc-1',
    label_id: '2',
    violation_type: 'unauthorized_access',
    severity: 'high',
    detected_at: new Date(Date.now() - 3600000).toISOString(),
    detected_by: 'System',
    description: 'User attempted to access HIPAA document without proper authorization',
    user_involved: 'unknown_user@example.com',
    resolved: false
  },
  {
    id: '2',
    document_id: 'doc-2',
    label_id: '1',
    violation_type: 'geo_violation',
    severity: 'medium',
    detected_at: new Date(Date.now() - 86400000).toISOString(),
    detected_by: 'System',
    description: 'Document accessed from restricted geographic location',
    user_involved: 'john@example.com',
    action_taken: 'Access blocked and logged',
    resolved: true,
    resolved_at: new Date(Date.now() - 43200000).toISOString(),
    resolved_by: 'Admin',
    resolution_notes: 'User verified and access granted from approved VPN'
  }
];

export interface UseComplianceLabelsOptions {
  documentId?: string;
  autoFetch?: boolean;
}

export const useComplianceLabels = (options: UseComplianceLabelsOptions = {}) => {
  const [labels, setLabels] = useState<ComplianceLabel[]>(mockLabels);
  const [documentLabels, setDocumentLabels] = useState<DocumentComplianceLabel[]>([]);
  const [auditEntries, setAuditEntries] = useState<ComplianceAuditEntry[]>(mockAuditEntries);
  const [violations, setViolations] = useState<ComplianceViolation[]>(mockViolations);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<ComplianceStats>({
    total_labels: 5,
    active_labels: 5,
    labeled_documents: 127,
    unlabeled_documents: 43,
    pending_reviews: 8,
    active_violations: 1,
    resolved_violations: 15,
    labels_by_framework: {
      GDPR: 45,
      HIPAA: 32,
      SOX: 18,
      PCI_DSS: 12,
      CCPA: 8,
      FERPA: 5,
      ISO_27001: 4,
      NIST: 2,
      SOC2: 1,
      CUSTOM: 0
    },
    labels_by_classification: {
      public: 15,
      internal: 42,
      confidential: 38,
      highly_confidential: 22,
      restricted: 10
    },
    recent_activity_count: 24
  });

  const fetchLabels = useCallback(async (framework?: ComplianceFramework) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (framework) {
        setLabels(mockLabels.filter(l => l.framework === framework));
      } else {
        setLabels(mockLabels);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createLabel = useCallback(async (label: Omit<ComplianceLabel, 'id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newLabel: ComplianceLabel = {
        ...label,
        id: `label-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setLabels(prev => [...prev, newLabel]);
      toast.success('Compliance label created successfully');
      return newLabel;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLabel = useCallback(async (id: string, updates: Partial<ComplianceLabel>) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setLabels(prev => prev.map(l => 
        l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ));
      toast.success('Compliance label updated');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteLabel = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setLabels(prev => prev.filter(l => l.id !== id));
      toast.success('Compliance label deleted');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyLabel = useCallback(async (
    documentId: string, 
    labelId: string, 
    justification?: string
  ) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const label = labels.find(l => l.id === labelId);
      if (!label) throw new Error('Label not found');

      const docLabel: DocumentComplianceLabel = {
        id: `doc-label-${Date.now()}`,
        document_id: documentId,
        label_id: labelId,
        label,
        applied_by: 'Current User',
        applied_at: new Date().toISOString(),
        status: 'active',
        justification,
        acknowledgments: [],
        metadata: {}
      };

      setDocumentLabels(prev => [...prev, docLabel]);
      
      // Add audit entry
      const auditEntry: ComplianceAuditEntry = {
        id: `audit-${Date.now()}`,
        document_id: documentId,
        label_id: labelId,
        action: 'applied',
        performed_by: 'Current User',
        performed_at: new Date().toISOString(),
        details: `Applied ${label.name} label to document`
      };
      setAuditEntries(prev => [auditEntry, ...prev]);

      toast.success(`Applied ${label.name} label`);
      return docLabel;
    } finally {
      setIsLoading(false);
    }
  }, [labels]);

  const removeLabel = useCallback(async (documentLabelId: string, reason?: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const docLabel = documentLabels.find(dl => dl.id === documentLabelId);
      if (docLabel) {
        setDocumentLabels(prev => prev.filter(dl => dl.id !== documentLabelId));
        
        const auditEntry: ComplianceAuditEntry = {
          id: `audit-${Date.now()}`,
          document_id: docLabel.document_id,
          label_id: docLabel.label_id,
          action: 'removed',
          performed_by: 'Current User',
          performed_at: new Date().toISOString(),
          details: `Removed ${docLabel.label.name} label${reason ? `: ${reason}` : ''}`
        };
        setAuditEntries(prev => [auditEntry, ...prev]);
      }
      toast.success('Label removed from document');
    } finally {
      setIsLoading(false);
    }
  }, [documentLabels]);

  const acknowledgeLabel = useCallback(async (documentLabelId: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDocumentLabels(prev => prev.map(dl => {
        if (dl.id === documentLabelId) {
          return {
            ...dl,
            acknowledgments: [
              ...dl.acknowledgments,
              {
                id: `ack-${Date.now()}`,
                user_id: 'current-user',
                user_name: 'Current User',
                user_email: 'user@example.com',
                acknowledged_at: new Date().toISOString(),
                acknowledgment_text: dl.label.acknowledgment_text || 'Acknowledged'
              }
            ]
          };
        }
        return dl;
      }));
      toast.success('Acknowledgment recorded');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveViolation = useCallback(async (violationId: string, notes: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setViolations(prev => prev.map(v => 
        v.id === violationId 
          ? {
              ...v,
              resolved: true,
              resolved_at: new Date().toISOString(),
              resolved_by: 'Current User',
              resolution_notes: notes
            }
          : v
      ));
      setStats(prev => ({
        ...prev,
        active_violations: prev.active_violations - 1,
        resolved_violations: prev.resolved_violations + 1
      }));
      toast.success('Violation resolved');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuditTrail = useCallback(async (documentId?: string, labelId?: string) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      let filtered = [...auditEntries];
      if (documentId) {
        filtered = filtered.filter(e => e.document_id === documentId);
      }
      if (labelId) {
        filtered = filtered.filter(e => e.label_id === labelId);
      }
      return filtered;
    } finally {
      setIsLoading(false);
    }
  }, [auditEntries]);

  return {
    labels,
    documentLabels,
    auditEntries,
    violations,
    stats,
    isLoading,
    fetchLabels,
    createLabel,
    updateLabel,
    deleteLabel,
    applyLabel,
    removeLabel,
    acknowledgeLabel,
    resolveViolation,
    getAuditTrail
  };
};
