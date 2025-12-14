import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  SignatureRequest,
  SignatureSigner,
  SignatureField,
  UserSignature,
  SignatureAuditLog,
  SignatureTemplate,
  SignatureStats,
  SignerRole,
  SignatureType,
} from '@/types/signature';

// Simplified hook with mock data - database schema needs alignment
export const useElectronicSignatures = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [userSignatures, setUserSignatures] = useState<UserSignature[]>([]);
  const [templates] = useState<SignatureTemplate[]>([]);
  const [stats] = useState<SignatureStats>({
    total_requests: 0,
    pending: 0,
    completed: 0,
    declined: 0,
    expired: 0,
    awaiting_my_signature: 0,
    completion_rate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeRequest, setActiveRequest] = useState<SignatureRequest | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    // Placeholder - would fetch from database once schema is aligned
    setIsLoading(false);
  }, []);

  const createRequest = async (data: {
    title: string;
    message?: string;
    document_name?: string;
    document_url?: string;
    signing_order?: 'parallel' | 'sequential';
    expires_at?: string;
    signers: Array<{ name: string; email: string; role?: SignerRole; signing_order?: number }>;
  }) => {
    const newRequest: SignatureRequest = {
      id: crypto.randomUUID(),
      user_id: 'current-user',
      title: data.title,
      message: data.message,
      document_name: data.document_name,
      document_url: data.document_url,
      status: 'draft',
      signing_order: data.signing_order || 'parallel',
      current_signer_index: 0,
      expires_at: data.expires_at,
      reminder_frequency_days: 3,
      is_template: false,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      signers: data.signers.map((s, i) => ({
        id: crypto.randomUUID(),
        request_id: '',
        name: s.name,
        email: s.email,
        role: s.role || 'signer',
        signing_order: s.signing_order ?? i,
        status: 'pending',
        access_token: crypto.randomUUID(),
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    };
    setRequests(prev => [newRequest, ...prev]);
    toast({ title: 'Success', description: 'Signature request created' });
    return newRequest;
  };

  const sendRequest = async (requestId: string) => {
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'pending' as const } : r
    ));
    toast({ title: 'Success', description: 'Signature request sent' });
  };

  const cancelRequest = async (requestId: string) => {
    setRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, status: 'cancelled' as const } : r
    ));
    toast({ title: 'Success', description: 'Request cancelled' });
  };

  const addField = async (field: Omit<SignatureField, 'id' | 'created_at' | 'metadata'>) => {
    console.log('Add field:', field);
  };

  const updateField = async (fieldId: string, updates: Partial<SignatureField>) => {
    console.log('Update field:', fieldId, updates);
  };

  const deleteField = async (fieldId: string) => {
    console.log('Delete field:', fieldId);
  };

  const signField = async (fieldId: string, value: string, signerId: string) => {
    toast({ title: 'Success', description: 'Signature applied' });
  };

  const declineToSign = async (signerId: string, reason: string) => {
    toast({ title: 'Declined', description: 'The sender has been notified' });
  };

  const saveUserSignature = async (data: {
    signature_type: SignatureType;
    name: string;
    data_url: string;
    font_family?: string;
    is_default?: boolean;
  }) => {
    const newSig: UserSignature = {
      id: crypto.randomUUID(),
      user_id: 'current-user',
      ...data,
      is_default: data.is_default || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUserSignatures(prev => [newSig, ...prev]);
    toast({ title: 'Success', description: 'Signature saved' });
  };

  const deleteUserSignature = async (signatureId: string) => {
    setUserSignatures(prev => prev.filter(s => s.id !== signatureId));
    toast({ title: 'Success', description: 'Signature deleted' });
  };

  const getAuditLog = async (requestId: string): Promise<SignatureAuditLog[]> => {
    return [];
  };

  return {
    requests,
    userSignatures,
    templates,
    stats,
    isLoading,
    activeRequest,
    setActiveRequest,
    refresh: fetchData,
    createRequest,
    sendRequest,
    cancelRequest,
    addField,
    updateField,
    deleteField,
    signField,
    declineToSign,
    saveUserSignature,
    deleteUserSignature,
    getAuditLog,
  };
};
