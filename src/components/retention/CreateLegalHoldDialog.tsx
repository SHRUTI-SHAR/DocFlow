import React, { useState } from 'react';
import { Scale, Calendar, User, Mail, FileText, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';

interface CreateLegalHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateLegalHoldDialog: React.FC<CreateLegalHoldDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createLegalHold } = useRetentionPolicies();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [matterId, setMatterId] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [custodianEmail, setCustodianEmail] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!name || !holdReason) return;

    setIsSubmitting(true);
    try {
      await createLegalHold({
        name,
        hold_reason: holdReason,
        matter_id: matterId || undefined,
        custodian_name: custodianName || undefined,
        custodian_email: custodianEmail || undefined,
        start_date: new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        status: 'active',
        document_ids: [],
        folder_ids: [],
        notes: notes || undefined,
        metadata: {},
      });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create legal hold:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setHoldReason('');
    setMatterId('');
    setCustodianName('');
    setCustodianEmail('');
    setEndDate('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-500" />
            Create Legal Hold
          </DialogTitle>
          <DialogDescription>
            Protect documents from disposition during litigation or investigation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-purple-500/10 border-purple-500/30">
            <AlertTriangle className="h-4 w-4 text-purple-500" />
            <AlertDescription className="text-sm">
              Documents under legal hold will be protected from all retention policy actions until the hold is released.
            </AlertDescription>
          </Alert>

          <div>
            <Label>Hold Name *</Label>
            <Input
              placeholder="e.g., Smith v. Company Litigation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Reason for Hold *</Label>
            <Textarea
              placeholder="Describe the legal matter or investigation requiring this hold..."
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Matter/Case ID
              </Label>
              <Input
                placeholder="CASE-2024-001"
                value={matterId}
                onChange={(e) => setMatterId(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Expected End Date
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Custodian Name
              </Label>
              <Input
                placeholder="Legal counsel name"
                value={custodianName}
                onChange={(e) => setCustodianName(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Custodian Email
              </Label>
              <Input
                type="email"
                placeholder="counsel@firm.com"
                value={custodianEmail}
                onChange={(e) => setCustodianEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional information about this hold..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !name || !holdReason}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Scale className="h-4 w-4 mr-2" />
            Create Legal Hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
