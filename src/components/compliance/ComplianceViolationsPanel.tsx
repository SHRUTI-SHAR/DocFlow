import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldOff,
  Globe,
  Download,
  Share2,
  Clock,
  CheckCircle2,
  User,
  FileText,
  Search,
  Filter,
  ChevronRight
} from 'lucide-react';
import { useComplianceLabels } from '@/hooks/useComplianceLabels';
import { ComplianceViolation, SENSITIVITY_LEVEL_CONFIG } from '@/types/compliance';
import { format } from 'date-fns';

const violationTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  unauthorized_access: { label: 'Unauthorized Access', icon: <ShieldOff className="h-4 w-4" />, color: 'text-red-500' },
  unauthorized_share: { label: 'Unauthorized Share', icon: <Share2 className="h-4 w-4" />, color: 'text-orange-500' },
  unauthorized_download: { label: 'Unauthorized Download', icon: <Download className="h-4 w-4" />, color: 'text-yellow-500' },
  retention_breach: { label: 'Retention Breach', icon: <Clock className="h-4 w-4" />, color: 'text-purple-500' },
  geo_violation: { label: 'Geographic Violation', icon: <Globe className="h-4 w-4" />, color: 'text-blue-500' },
  policy_breach: { label: 'Policy Breach', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' }
};

export const ComplianceViolationsPanel: React.FC = () => {
  const { violations, resolveViolation, isLoading, labels } = useComplianceLabels();
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolation | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const filteredViolations = violations.filter(v => {
    const matchesSearch = v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.violation_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ||
                         (filter === 'active' && !v.resolved) ||
                         (filter === 'resolved' && v.resolved);
    return matchesSearch && matchesFilter;
  });

  const activeCount = violations.filter(v => !v.resolved).length;
  const resolvedCount = violations.filter(v => v.resolved).length;

  const handleResolve = async () => {
    if (selectedViolation) {
      await resolveViolation(selectedViolation.id, resolutionNotes);
      setResolveDialogOpen(false);
      setSelectedViolation(null);
      setResolutionNotes('');
    }
  };

  const getLabel = (labelId: string) => labels.find(l => l.id === labelId);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={filter === 'all' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setFilter('all')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Violations</p>
                <p className="text-2xl font-bold">{violations.length}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className={filter === 'active' ? 'ring-2 ring-destructive' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setFilter('active')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-destructive">{activeCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className={filter === 'resolved' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="p-4 cursor-pointer" onClick={() => setFilter('resolved')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search violations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compliance Violations</CardTitle>
          <CardDescription>
            Monitor and resolve policy violations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No violations found</h3>
                <p className="text-muted-foreground">
                  {filter === 'active' ? 'All violations have been resolved' : 'No violations match your search'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredViolations.map((violation) => {
                  const typeConfig = violationTypeConfig[violation.violation_type];
                  const severityConfig = SENSITIVITY_LEVEL_CONFIG[violation.severity];
                  const label = getLabel(violation.label_id);

                  return (
                    <div
                      key={violation.id}
                      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedViolation(violation)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          violation.resolved ? 'bg-green-100' : 'bg-destructive/10'
                        }`}>
                          {violation.resolved ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className={typeConfig?.color}>{typeConfig?.icon}</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{typeConfig?.label}</span>
                            <Badge
                              variant="outline"
                              className={`${severityConfig.bgColor} ${severityConfig.color}`}
                            >
                              {severityConfig.label}
                            </Badge>
                            {violation.resolved && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Resolved
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {violation.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(violation.detected_at), 'MMM d, yyyy HH:mm')}
                            </span>
                            {violation.user_involved && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {violation.user_involved}
                              </span>
                            )}
                            {label && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {label.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Violation Detail Dialog */}
      <Dialog open={!!selectedViolation && !resolveDialogOpen} onOpenChange={() => setSelectedViolation(null)}>
        <DialogContent className="max-w-lg">
          {selectedViolation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={violationTypeConfig[selectedViolation.violation_type]?.color}>
                    {violationTypeConfig[selectedViolation.violation_type]?.icon}
                  </span>
                  {violationTypeConfig[selectedViolation.violation_type]?.label}
                </DialogTitle>
                <DialogDescription>
                  Detected on {format(new Date(selectedViolation.detected_at), 'MMMM d, yyyy \'at\' HH:mm')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={`${SENSITIVITY_LEVEL_CONFIG[selectedViolation.severity].bgColor} ${SENSITIVITY_LEVEL_CONFIG[selectedViolation.severity].color}`}
                  >
                    {SENSITIVITY_LEVEL_CONFIG[selectedViolation.severity].label} Severity
                  </Badge>
                  {selectedViolation.resolved && (
                    <Badge className="bg-green-500">Resolved</Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedViolation.description}
                  </p>
                </div>

                {selectedViolation.user_involved && (
                  <div>
                    <p className="text-sm font-medium mb-1">User Involved</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedViolation.user_involved}
                    </p>
                  </div>
                )}

                {selectedViolation.action_taken && (
                  <div>
                    <p className="text-sm font-medium mb-1">Action Taken</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedViolation.action_taken}
                    </p>
                  </div>
                )}

                {selectedViolation.resolved && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm font-medium text-green-800 mb-1">Resolution</p>
                    <p className="text-sm text-green-700">
                      {selectedViolation.resolution_notes}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Resolved by {selectedViolation.resolved_by} on{' '}
                      {format(new Date(selectedViolation.resolved_at!), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedViolation(null)}>
                  Close
                </Button>
                {!selectedViolation.resolved && (
                  <Button onClick={() => setResolveDialogOpen(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Resolve Violation
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Violation</DialogTitle>
            <DialogDescription>
              Provide resolution details for this compliance violation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how this violation was resolved..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNotes.trim() || isLoading}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
