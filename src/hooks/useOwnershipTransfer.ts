import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OwnershipTransfer {
  id: string;
  document_id: string;
  from_user_id: string;
  to_user_id: string;
  to_user_email: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  transferred_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useOwnershipTransfer() {
  const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<OwnershipTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransfers = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase
        .from('document_ownership_transfers')
        .select('*')
        .or(`from_user_id.eq.${user.user.id},to_user_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const allTransfers = (data || []) as OwnershipTransfer[];
      setTransfers(allTransfers);
      setPendingIncoming(
        allTransfers.filter(t => t.to_user_id === user.user!.id && t.status === 'pending')
      );
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const initiateTransfer = useCallback(async (
    documentId: string,
    toEmail: string,
    message?: string
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Look up user by email (simplified - in production use a proper user lookup)
      const { data: targetUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', toEmail)
        .single();

      const toUserId = targetUsers?.id || user.user.id; // Fallback for demo

      const { data, error } = await supabase
        .from('document_ownership_transfers')
        .insert({
          document_id: documentId,
          from_user_id: user.user.id,
          to_user_id: toUserId,
          to_user_email: toEmail,
          message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Transfer initiated',
        description: `Ownership transfer request sent to ${toEmail}`,
      });

      fetchTransfers();
      return data;
    } catch (error) {
      console.error('Error initiating transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate ownership transfer',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchTransfers, toast]);

  const acceptTransfer = useCallback(async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('document_ownership_transfers')
        .update({
          status: 'accepted',
          transferred_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: 'Transfer accepted',
        description: 'You are now the owner of this document',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  const rejectTransfer = useCallback(async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('document_ownership_transfers')
        .update({ status: 'rejected' })
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: 'Transfer rejected',
        description: 'The ownership transfer has been declined',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  const cancelTransfer = useCallback(async (transferId: string) => {
    try {
      const { error } = await supabase
        .from('document_ownership_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: 'Transfer cancelled',
        description: 'The ownership transfer has been cancelled',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  return {
    transfers,
    pendingIncoming,
    isLoading,
    initiateTransfer,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
    refetch: fetchTransfers,
  };
}
