import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  EnhancedLegalHold,
  LegalHoldCustodian,
  LegalHoldAuditEntry,
  LegalHoldNotification,
  CreateLegalHoldParams,
  LegalHoldStatus,
  CustodianStatus
} from '@/types/legalHold';

// Mock data
const mockHolds: EnhancedLegalHold[] = [
  {
    id: '1',
    name: 'Smith v. Acme Corp Litigation Hold',
    description: 'Document preservation for ongoing litigation',
    matter_id: 'MAT-2024-001',
    matter_name: 'Smith v. Acme Corporation',
    matter_type: 'litigation',
    case_number: 'CV-2024-12345',
    court_name: 'US District Court, Northern District',
    opposing_party: 'John Smith',
    hold_reason: 'Preservation of all documents related to product liability claims and internal communications regarding product safety testing.',
    scope: 'search_criteria',
    scope_details: {
      keywords: ['product safety', 'testing', 'liability'],
      date_range: { start: '2023-01-01', end: '2024-12-31' }
    },
    issue_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    effective_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    anticipated_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    requires_acknowledgment: true,
    acknowledgment_deadline_days: 5,
    custodians: [
      {
        id: 'c1',
        hold_id: '1',
        name: 'Jane Wilson',
        email: 'jane.wilson@company.com',
        department: 'Engineering',
        title: 'Senior Engineer',
        status: 'acknowledged',
        acknowledged_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        reminder_count: 0,
        document_count: 145,
        added_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        added_by: 'legal-admin'
      },
      {
        id: 'c2',
        hold_id: '1',
        name: 'Robert Chen',
        email: 'robert.chen@company.com',
        department: 'Quality Assurance',
        title: 'QA Manager',
        status: 'acknowledged',
        acknowledged_at: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString(),
        reminder_count: 1,
        document_count: 89,
        added_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        added_by: 'legal-admin'
      },
      {
        id: 'c3',
        hold_id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@company.com',
        department: 'Legal',
        title: 'General Counsel',
        status: 'pending',
        reminder_count: 2,
        last_reminded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        document_count: 234,
        added_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        added_by: 'legal-admin'
      }
    ],
    document_count: 468,
    folder_count: 12,
    total_size_bytes: 1024 * 1024 * 850,
    send_reminders: true,
    reminder_frequency_days: 7,
    escalation_enabled: true,
    escalation_after_days: 14,
    escalation_contacts: ['legal-director@company.com'],
    issuing_attorney: 'Michael Brown',
    legal_team_emails: ['legal@company.com'],
    created_by: 'legal-admin',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    stats: {
      total_custodians: 3,
      acknowledged_custodians: 2,
      pending_custodians: 1,
      escalated_custodians: 0,
      total_documents: 468,
      total_size_bytes: 1024 * 1024 * 850,
      notifications_sent: 8,
      days_active: 30
    }
  },
  {
    id: '2',
    name: 'SEC Investigation Hold',
    description: 'Regulatory inquiry document preservation',
    matter_id: 'MAT-2024-002',
    matter_name: 'SEC Regulatory Inquiry 2024',
    matter_type: 'regulatory',
    hold_reason: 'Preservation of all financial records and communications related to Q3 2024 reporting.',
    scope: 'folder',
    scope_details: {
      folder_ids: ['finance-2024', 'exec-communications']
    },
    issue_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    effective_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    requires_acknowledgment: true,
    acknowledgment_deadline_days: 3,
    custodians: [
      {
        id: 'c4',
        hold_id: '2',
        name: 'David Kim',
        email: 'david.kim@company.com',
        department: 'Finance',
        title: 'CFO',
        status: 'acknowledged',
        acknowledged_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        reminder_count: 0,
        document_count: 312,
        added_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        added_by: 'legal-admin'
      }
    ],
    document_count: 312,
    folder_count: 2,
    total_size_bytes: 1024 * 1024 * 450,
    send_reminders: true,
    reminder_frequency_days: 3,
    escalation_enabled: true,
    escalation_after_days: 7,
    escalation_contacts: ['ceo@company.com'],
    legal_team_emails: ['legal@company.com'],
    created_by: 'legal-admin',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    stats: {
      total_custodians: 1,
      acknowledged_custodians: 1,
      pending_custodians: 0,
      escalated_custodians: 0,
      total_documents: 312,
      total_size_bytes: 1024 * 1024 * 450,
      notifications_sent: 2,
      days_active: 14
    }
  }
];

const mockAuditEntries: LegalHoldAuditEntry[] = [
  {
    id: 'a1',
    hold_id: '1',
    action: 'hold_created',
    actor_id: 'legal-admin',
    actor_name: 'Legal Admin',
    details: { matter_name: 'Smith v. Acme Corporation' },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a2',
    hold_id: '1',
    action: 'custodian_added',
    actor_id: 'legal-admin',
    actor_name: 'Legal Admin',
    target_type: 'custodian',
    target_name: 'Jane Wilson',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a3',
    hold_id: '1',
    action: 'notification_sent',
    actor_id: 'system',
    actor_name: 'System',
    target_type: 'custodian',
    target_name: 'Jane Wilson',
    details: { type: 'hold_notice' },
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'a4',
    hold_id: '1',
    action: 'custodian_acknowledged',
    actor_id: 'jane-wilson',
    actor_name: 'Jane Wilson',
    target_type: 'custodian',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export function useLegalHolds() {
  const [holds, setHolds] = useState<EnhancedLegalHold[]>(mockHolds);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHolds = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setHolds(mockHolds);
    } finally {
      setLoading(false);
    }
  }, []);

  const createHold = useCallback(async (params: CreateLegalHoldParams): Promise<EnhancedLegalHold | null> => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newHold: EnhancedLegalHold = {
        id: `hold-${Date.now()}`,
        name: params.name,
        matter_id: params.matter_id,
        matter_name: params.matter_name,
        matter_type: params.matter_type,
        hold_reason: params.hold_reason,
        scope: params.scope,
        scope_details: params.scope_details,
        issue_date: new Date().toISOString(),
        effective_date: params.effective_date || new Date().toISOString(),
        anticipated_end_date: params.anticipated_end_date,
        status: 'active',
        requires_acknowledgment: params.requires_acknowledgment ?? true,
        acknowledgment_deadline_days: params.acknowledgment_deadline_days ?? 5,
        custodians: [],
        document_count: 0,
        folder_count: 0,
        total_size_bytes: 0,
        send_reminders: params.send_reminders ?? true,
        reminder_frequency_days: params.reminder_frequency_days ?? 7,
        escalation_enabled: params.escalation_enabled ?? true,
        escalation_after_days: params.escalation_after_days ?? 14,
        escalation_contacts: params.escalation_contacts || [],
        legal_team_emails: params.legal_team_emails || [],
        internal_notes: params.internal_notes,
        created_by: 'current-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        attachments: []
      };

      setHolds(prev => [newHold, ...prev]);
      toast({
        title: 'Legal hold created',
        description: `"${newHold.name}" has been created and is now active`
      });
      return newHold;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create legal hold',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const releaseHold = useCallback(async (
    holdId: string, 
    reason: string,
    approvedBy?: string
  ): Promise<boolean> => {
    try {
      setHolds(prev => prev.map(hold =>
        hold.id === holdId
          ? {
              ...hold,
              status: 'released' as LegalHoldStatus,
              released_date: new Date().toISOString(),
              release_reason: reason,
              released_by: 'current-user',
              release_approved_by: approvedBy,
              updated_at: new Date().toISOString()
            }
          : hold
      ));
      toast({
        title: 'Legal hold released',
        description: 'The legal hold has been lifted and custodians notified'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to release legal hold',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const addCustodian = useCallback(async (
    holdId: string,
    custodian: Omit<LegalHoldCustodian, 'id' | 'hold_id' | 'status' | 'reminder_count' | 'added_at' | 'added_by'>
  ): Promise<boolean> => {
    try {
      const newCustodian: LegalHoldCustodian = {
        ...custodian,
        id: `cust-${Date.now()}`,
        hold_id: holdId,
        status: 'pending',
        reminder_count: 0,
        added_at: new Date().toISOString(),
        added_by: 'current-user'
      };

      setHolds(prev => prev.map(hold =>
        hold.id === holdId
          ? {
              ...hold,
              custodians: [...hold.custodians, newCustodian],
              updated_at: new Date().toISOString()
            }
          : hold
      ));
      toast({
        title: 'Custodian added',
        description: `${custodian.name} has been added and notified`
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add custodian',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const removeCustodian = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      setHolds(prev => prev.map(hold =>
        hold.id === holdId
          ? {
              ...hold,
              custodians: hold.custodians.filter(c => c.id !== custodianId),
              updated_at: new Date().toISOString()
            }
          : hold
      ));
      toast({
        title: 'Custodian removed',
        description: 'The custodian has been removed from this hold'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove custodian',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const sendReminder = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      setHolds(prev => prev.map(hold =>
        hold.id === holdId
          ? {
              ...hold,
              custodians: hold.custodians.map(c =>
                c.id === custodianId
                  ? {
                      ...c,
                      status: 'reminded' as CustodianStatus,
                      reminder_count: c.reminder_count + 1,
                      last_reminded_at: new Date().toISOString()
                    }
                  : c
              ),
              updated_at: new Date().toISOString()
            }
          : hold
      ));
      toast({
        title: 'Reminder sent',
        description: 'A reminder has been sent to the custodian'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const escalateCustodian = useCallback(async (holdId: string, custodianId: string): Promise<boolean> => {
    try {
      setHolds(prev => prev.map(hold =>
        hold.id === holdId
          ? {
              ...hold,
              custodians: hold.custodians.map(c =>
                c.id === custodianId
                  ? {
                      ...c,
                      status: 'escalated' as CustodianStatus,
                      escalated_at: new Date().toISOString()
                    }
                  : c
              ),
              updated_at: new Date().toISOString()
            }
          : hold
      ));
      toast({
        title: 'Custodian escalated',
        description: 'Escalation contacts have been notified'
      });
      return true;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to escalate',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  const getAuditTrail = useCallback(async (holdId: string): Promise<LegalHoldAuditEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAuditEntries.filter(a => a.hold_id === holdId);
  }, []);

  useEffect(() => {
    fetchHolds();
  }, [fetchHolds]);

  return {
    holds,
    loading,
    fetchHolds,
    createHold,
    releaseHold,
    addCustodian,
    removeCustodian,
    sendReminder,
    escalateCustodian,
    getAuditTrail
  };
}
