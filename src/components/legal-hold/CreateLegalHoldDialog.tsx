import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Scale,
  Gavel,
  Search,
  Shield,
  FileText,
  Folder,
  User,
  Calendar,
  Plus,
  X,
  AlertTriangle,
  Bell,
  Mail
} from 'lucide-react';
import type { CreateLegalHoldParams, HoldScope } from '@/types/legalHold';
import { MATTER_TYPES, HOLD_SCOPE_OPTIONS } from '@/types/legalHold';

interface CreateLegalHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHold: (params: CreateLegalHoldParams) => Promise<any>;
}

export const CreateLegalHoldDialog: React.FC<CreateLegalHoldDialogProps> = ({
  open,
  onOpenChange,
  onCreateHold
}) => {
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Step 1: Matter Info
  const [name, setName] = useState('');
  const [matterId, setMatterId] = useState('');
  const [matterName, setMatterName] = useState('');
  const [matterType, setMatterType] = useState<CreateLegalHoldParams['matter_type']>('litigation');
  const [caseNumber, setCaseNumber] = useState('');
  const [holdReason, setHoldReason] = useState('');

  // Step 2: Scope
  const [scope, setScope] = useState<HoldScope>('search_criteria');
  const [keywords, setKeywords] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  // Step 3: Custodians
  const [custodianEmails, setCustodianEmails] = useState<string[]>([]);
  const [newCustodianEmail, setNewCustodianEmail] = useState('');

  // Step 4: Settings
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(true);
  const [acknowledgmentDeadline, setAcknowledgmentDeadline] = useState(5);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState(7);
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationAfterDays, setEscalationAfterDays] = useState(14);
  const [legalTeamEmail, setLegalTeamEmail] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const handleCreate = async () => {
    setCreating(true);
    try {
      const params: CreateLegalHoldParams = {
        name,
        matter_id: matterId,
        matter_name: matterName,
        matter_type: matterType,
        hold_reason: holdReason,
        scope,
        scope_details: {
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          date_range: dateRangeStart && dateRangeEnd 
            ? { start: dateRangeStart, end: dateRangeEnd }
            : undefined
        },
        custodian_emails: custodianEmails,
        requires_acknowledgment: requiresAcknowledgment,
        acknowledgment_deadline_days: acknowledgmentDeadline,
        send_reminders: sendReminders,
        reminder_frequency_days: reminderFrequency,
        escalation_enabled: escalationEnabled,
        escalation_after_days: escalationAfterDays,
        legal_team_emails: legalTeamEmail ? [legalTeamEmail] : [],
        internal_notes: internalNotes
      };

      await onCreateHold(params);
      onOpenChange(false);
      resetForm();
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setMatterId('');
    setMatterName('');
    setMatterType('litigation');
    setCaseNumber('');
    setHoldReason('');
    setScope('search_criteria');
    setKeywords('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setCustodianEmails([]);
    setNewCustodianEmail('');
    setRequiresAcknowledgment(true);
    setAcknowledgmentDeadline(5);
    setSendReminders(true);
    setReminderFrequency(7);
    setEscalationEnabled(true);
    setEscalationAfterDays(14);
    setLegalTeamEmail('');
    setInternalNotes('');
  };

  const addCustodian = () => {
    if (newCustodianEmail && !custodianEmails.includes(newCustodianEmail)) {
      setCustodianEmails([...custodianEmails, newCustodianEmail]);
      setNewCustodianEmail('');
    }
  };

  const getMatterIcon = (type: string) => {
    switch (type) {
      case 'litigation': return <Gavel className="w-4 h-4" />;
      case 'investigation': return <Search className="w-4 h-4" />;
      case 'regulatory': return <Shield className="w-4 h-4" />;
      case 'audit': return <FileText className="w-4 h-4" />;
      default: return <Scale className="w-4 h-4" />;
    }
  };

  const getScopeIcon = (s: HoldScope) => {
    switch (s) {
      case 'specific_documents': return <FileText className="w-4 h-4" />;
      case 'folder': return <Folder className="w-4 h-4" />;
      case 'search_criteria': return <Search className="w-4 h-4" />;
      case 'custodian_content': return <User className="w-4 h-4" />;
      case 'date_range': return <Calendar className="w-4 h-4" />;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name && matterId && matterName && holdReason;
      case 2: return scope;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            Create Legal Hold
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Enter matter information and hold details'}
            {step === 2 && 'Define the scope of documents to preserve'}
            {step === 3 && 'Add custodians who will receive hold notices'}
            {step === 4 && 'Configure notifications and settings'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-purple-600' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hold Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Smith v. Acme Corp Litigation Hold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matterId">Matter ID *</Label>
                  <Input
                    id="matterId"
                    placeholder="e.g., MAT-2024-001"
                    value={matterId}
                    onChange={(e) => setMatterId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caseNumber">Case Number</Label>
                  <Input
                    id="caseNumber"
                    placeholder="e.g., CV-2024-12345"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matterName">Matter Name *</Label>
                <Input
                  id="matterName"
                  placeholder="e.g., Smith v. Acme Corporation"
                  value={matterName}
                  onChange={(e) => setMatterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Matter Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MATTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMatterType(type.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                        matterType === type.value
                          ? 'border-purple-500 bg-purple-500/5'
                          : 'border-border hover:border-purple-500/50'
                      }`}
                    >
                      {getMatterIcon(type.value)}
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdReason">Hold Reason / Preservation Notice *</Label>
                <Textarea
                  id="holdReason"
                  placeholder="Describe the legal matter and what documents need to be preserved..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Scope Type</Label>
                {HOLD_SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                      scope === option.value
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-border hover:border-purple-500/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      scope === option.value ? 'bg-purple-500/20' : 'bg-muted'
                    }`}>
                      {getScopeIcon(option.value)}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Separator />

              {scope === 'search_criteria' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      placeholder="e.g., contract, agreement, safety"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date Range Start</Label>
                      <Input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Range End</Label>
                      <Input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {scope === 'date_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Custodian Notification</p>
                    <p className="text-muted-foreground">
                      Custodians will receive a legal hold notice and must acknowledge their preservation obligations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Custodians</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="custodian@company.com"
                    value={newCustodianEmail}
                    onChange={(e) => setNewCustodianEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustodian()}
                  />
                  <Button onClick={addCustodian} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {custodianEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Custodians ({custodianEmails.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {custodianEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1 py-1">
                        <User className="w-3 h-3" />
                        {email}
                        <button onClick={() => setCustodianEmails(custodianEmails.filter(e => e !== email))}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {custodianEmails.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No custodians added yet</p>
                  <p className="text-sm">You can add custodians now or later</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Acknowledgment Settings
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Acknowledgment</Label>
                    <p className="text-xs text-muted-foreground">
                      Custodians must acknowledge the hold notice
                    </p>
                  </div>
                  <Switch checked={requiresAcknowledgment} onCheckedChange={setRequiresAcknowledgment} />
                </div>

                {requiresAcknowledgment && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>Deadline:</Label>
                    <Input
                      type="number"
                      value={acknowledgmentDeadline}
                      onChange={(e) => setAcknowledgmentDeadline(parseInt(e.target.value) || 5)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Reminder Settings
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically remind unacknowledged custodians
                    </p>
                  </div>
                  <Switch checked={sendReminders} onCheckedChange={setSendReminders} />
                </div>

                {sendReminders && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>Every:</Label>
                    <Input
                      type="number"
                      value={reminderFrequency}
                      onChange={(e) => setReminderFrequency(parseInt(e.target.value) || 7)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Escalation</Label>
                    <p className="text-xs text-muted-foreground">
                      Escalate to legal team if no response
                    </p>
                  </div>
                  <Switch checked={escalationEnabled} onCheckedChange={setEscalationEnabled} />
                </div>

                {escalationEnabled && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>After:</Label>
                    <Input
                      type="number"
                      value={escalationAfterDays}
                      onChange={(e) => setEscalationAfterDays(parseInt(e.target.value) || 14)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Legal Team Email</Label>
                <Input
                  type="email"
                  placeholder="legal@company.com"
                  value={legalTeamEmail}
                  onChange={(e) => setLegalTeamEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button 
              onClick={() => setStep(step + 1)} 
              disabled={!canProceed()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleCreate} 
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? 'Creating...' : 'Create Legal Hold'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
