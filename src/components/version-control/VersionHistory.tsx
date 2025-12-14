import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  History,
  RotateCcw,
  GitBranch,
  MessageSquare,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  Clock,
  User,
  Trash2,
  Eye,
  GitCompare,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DocumentVersion, VersionBranch } from '@/types/versionControl';

interface VersionHistoryProps {
  versions: DocumentVersion[];
  branches: VersionBranch[];
  currentVersion?: DocumentVersion | null;
  activeBranchId?: string | null;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onCompare: (version1Id: string, version2Id: string) => void;
  onViewVersion: (version: DocumentVersion) => void;
  onSwitchBranch: (branchId: string | null) => void;
  onCreateBranch: (baseVersionId: string) => void;
  selectedForCompare?: string | null;
  onSelectForCompare: (versionId: string | null) => void;
  isLoading?: boolean;
}

export function VersionHistory({
  versions,
  branches,
  currentVersion,
  activeBranchId,
  onRestore,
  onDelete,
  onCompare,
  onViewVersion,
  onSwitchBranch,
  onCreateBranch,
  selectedForCompare,
  onSelectForCompare,
  isLoading,
}: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const toggleExpanded = (versionId: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(versionId)) {
        next.delete(versionId);
      } else {
        next.add(versionId);
      }
      return next;
    });
  };

  const getChangeTypeColor = (type: DocumentVersion['change_type']) => {
    switch (type) {
      case 'manual':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'auto':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'restore':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'branch_merge':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getChangeTypeLabel = (type: DocumentVersion['change_type']) => {
    switch (type) {
      case 'manual':
        return 'Manual';
      case 'auto':
        return 'Auto-saved';
      case 'restore':
        return 'Restored';
      case 'branch_merge':
        return 'Merged';
      default:
        return type;
    }
  };

  // Group versions by date
  const groupedVersions = versions.reduce((acc, version) => {
    const date = format(new Date(version.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(version);
    return acc;
  }, {} as Record<string, DocumentVersion[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with branch selector */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Version History</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {versions.length} versions
          </Badge>
        </div>

        {/* Branch selector */}
        {branches.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>
                    {activeBranchId
                      ? branches.find(b => b.id === activeBranchId)?.branch_name || 'Main'
                      : 'Main Branch'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => onSwitchBranch(null)}>
                <GitBranch className="h-4 w-4 mr-2" />
                Main Branch
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {branches.map(branch => (
                <DropdownMenuItem
                  key={branch.id}
                  onClick={() => onSwitchBranch(branch.id)}
                  className={cn(
                    branch.id === activeBranchId && 'bg-accent'
                  )}
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  {branch.branch_name}
                  {branch.status !== 'active' && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {branch.status}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Compare mode indicator */}
      {selectedForCompare && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary">
              <GitCompare className="h-4 w-4" />
              <span>Select another version to compare</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectForCompare(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Version list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(groupedVersions).map(([date, dateVersions]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground px-2">
                  {format(new Date(date), 'MMMM d, yyyy')}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                {dateVersions.map(version => (
                  <Collapsible
                    key={version.id}
                    open={expandedVersions.has(version.id)}
                    onOpenChange={() => toggleExpanded(version.id)}
                  >
                    <div
                      className={cn(
                        'rounded-lg border border-border bg-card transition-all',
                        version.is_current && 'ring-2 ring-primary/50 border-primary/50',
                        selectedForCompare === version.id && 'ring-2 ring-amber-500/50 border-amber-500/50'
                      )}
                    >
                      {/* Version header */}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                {expandedVersions.has(version.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-semibold text-sm">
                                  v{version.major_version}.{version.minor_version}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn('text-xs', getChangeTypeColor(version.change_type))}
                                >
                                  {getChangeTypeLabel(version.change_type)}
                                </Badge>
                                {version.is_current && (
                                  <Badge className="text-xs bg-primary">
                                    Current
                                  </Badge>
                                )}
                              </div>

                              {version.change_summary && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                  {version.change_summary}
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(version.created_at), 'HH:mm')}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {format(new Date(version.created_at), 'PPpp')}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {version.creator_email && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {version.creator_email}
                                  </span>
                                )}

                                {version.comments_count && version.comments_count > 0 && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {version.comments_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onViewVersion(version)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {selectedForCompare && selectedForCompare !== version.id ? (
                                <DropdownMenuItem
                                  onClick={() => onCompare(selectedForCompare, version.id)}
                                >
                                  <GitCompare className="h-4 w-4 mr-2" />
                                  Compare with Selected
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => onSelectForCompare(version.id)}
                                >
                                  <GitCompare className="h-4 w-4 mr-2" />
                                  Select for Compare
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => onCreateBranch(version.id)}>
                                <GitBranch className="h-4 w-4 mr-2" />
                                Create Branch
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {!version.is_current && (
                                <DropdownMenuItem onClick={() => onRestore(version.id)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore This Version
                                </DropdownMenuItem>
                              )}

                              {!version.is_current && (
                                <DropdownMenuItem
                                  onClick={() => onDelete(version.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border mt-2">
                          {/* AI Summary */}
                          {version.ai_change_summary && (
                            <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-primary mb-1">AI Summary</p>
                                <p className="text-sm text-muted-foreground">
                                  {version.ai_change_summary}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {version.tags && version.tags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {version.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Quick actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => onViewVersion(version)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {!version.is_current && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => onRestore(version.id)}
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restore
                              </Button>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          ))}

          {versions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No version history yet</p>
              <p className="text-sm">Changes will be tracked automatically</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
