import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  KeyRound, Check, X, Clock, MessageSquare,
  AlertCircle
} from 'lucide-react';
import { PermissionRequest, PermissionLevel } from '@/types/permissions';
import { PermissionSelector } from './PermissionSelector';
import { PermissionBadge } from './PermissionBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AccessRequestPanelProps {
  requests: PermissionRequest[];
  onApprove: (requestId: string, notes?: string) => Promise<boolean>;
  onDeny: (requestId: string, notes?: string) => Promise<boolean>;
  onRequestAccess?: (level: PermissionLevel, message?: string) => Promise<boolean>;
  currentLevel?: PermissionLevel;
  canManage?: boolean;
  showRequestForm?: boolean;
}

export const AccessRequestPanel: React.FC<AccessRequestPanelProps> = ({
  requests,
  onApprove,
  onDeny,
  onRequestAccess,
  currentLevel = 'none',
  canManage = false,
  showRequestForm = false
}) => {
  const [selectedRequest, setSelectedRequest] = useState<PermissionRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Request form state
  const [requestLevel, setRequestLevel] = useState<PermissionLevel>('viewer');
  const [requestMessage, setRequestMessage] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    await onApprove(selectedRequest.id, reviewNotes || undefined);
    setSelectedRequest(null);
    setReviewNotes('');
    setIsProcessing(false);
  };

  const handleDeny = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    await onDeny(selectedRequest.id, reviewNotes || undefined);
    setSelectedRequest(null);
    setReviewNotes('');
    setIsProcessing(false);
  };

  const handleRequestAccess = async () => {
    if (!onRequestAccess) return;
    setIsRequesting(true);
    await onRequestAccess(requestLevel, requestMessage || undefined);
    setRequestMessage('');
    setIsRequesting(false);
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500">Approved</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Access Requests
        </CardTitle>
        <CardDescription>
          {canManage 
            ? 'Review and manage access requests'
            : 'Request access to this resource'
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Request Access Form */}
        {showRequestForm && onRequestAccess && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Request Access</p>
                <p className="text-sm text-muted-foreground">
                  You currently have {currentLevel === 'none' ? 'no' : currentLevel} access.
                  Request a higher permission level below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <PermissionSelector
                value={requestLevel}
                onChange={setRequestLevel}
                maxLevel="admin"
                excludeLevels={['none', 'owner']}
              />

              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Why do you need this access? (optional)"
                rows={2}
              />

              <Button 
                onClick={handleRequestAccess} 
                disabled={isRequesting}
                className="w-full"
              >
                {isRequesting ? 'Requesting...' : 'Request Access'}
              </Button>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {canManage && pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Requests ({pendingRequests.length})
            </h4>
            
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={request.requester?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(request.requester?.name, request.requester?.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {request.requester?.name || request.requester?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Requesting:</span>
                        <PermissionBadge level={request.requested_level} size="sm" />
                      </div>

                      {request.message && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{request.message}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                          className="gap-1"
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                          }}
                          className="gap-1"
                        >
                          <X className="h-4 w-4" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Reviewed Requests History */}
        {reviewedRequests.length > 0 && (
          <>
            {pendingRequests.length > 0 && <Separator />}
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Request History
              </h4>
              
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {reviewedRequests.slice(0, 10).map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center gap-3 p-2 text-sm opacity-60"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(request.requester?.name, request.requester?.email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <span className="truncate flex-1">
                        {request.requester?.name || request.requester?.email}
                      </span>
                      
                      <PermissionBadge level={request.requested_level} size="sm" />
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {pendingRequests.length === 0 && reviewedRequests.length === 0 && !showRequestForm && (
          <div className="text-center py-8 text-muted-foreground">
            <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No access requests</p>
          </div>
        )}
      </CardContent>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Access Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.requester?.name || selectedRequest?.requester?.email} is requesting{' '}
              <span className="font-medium">{selectedRequest?.requested_level}</span> access
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedRequest?.message && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Message:</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Review Notes (optional)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add a note about your decision..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedRequest(null)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeny}
              disabled={isProcessing}
            >
              Deny Request
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={isProcessing}
            >
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
