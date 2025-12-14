import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  GitCompare,
  Plus,
  Minus,
  ArrowLeftRight,
  Equal,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { VersionComparison as VersionComparisonType, VersionDiff } from '@/types/versionControl';

interface VersionComparisonProps {
  comparison: VersionComparisonType;
  onClose: () => void;
  onGenerateAISummary?: () => Promise<void>;
  isGeneratingAI?: boolean;
}

export function VersionComparison({
  comparison,
  onClose,
  onGenerateAISummary,
  isGeneratingAI,
}: VersionComparisonProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'added' | 'removed' | 'modified'>('all');

  const { baseVersion, compareVersion, diffs, summary, aiSummary } = comparison;

  const filteredDiffs = useMemo(() => {
    if (filter === 'all') return diffs.filter(d => d.type !== 'unchanged');
    return diffs.filter(d => d.type === filter);
  }, [diffs, filter]);

  const toggleExpanded = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getDiffIcon = (type: VersionDiff['type']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-500" />;
      case 'modified':
        return <ArrowLeftRight className="h-4 w-4 text-amber-500" />;
      case 'unchanged':
        return <Equal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDiffColor = (type: VersionDiff['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-500/10 border-green-500/20';
      case 'removed':
        return 'bg-red-500/10 border-red-500/20';
      case 'modified':
        return 'bg-amber-500/10 border-amber-500/20';
      default:
        return 'bg-muted';
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Version Comparison</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Version indicators */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
          <div className="flex-1 text-center">
            <Badge variant="outline" className="mb-1">Base</Badge>
            <p className="font-mono text-sm font-semibold">
              v{baseVersion.major_version}.{baseVersion.minor_version}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(baseVersion.created_at), 'MMM d, HH:mm')}
            </p>
          </div>
          <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-center">
            <Badge variant="outline" className="mb-1">Compare</Badge>
            <p className="font-mono text-sm font-semibold">
              v{compareVersion.major_version}.{compareVersion.minor_version}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(compareVersion.created_at), 'MMM d, HH:mm')}
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => setFilter(filter === 'added' ? 'all' : 'added')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors',
              filter === 'added' ? 'bg-green-500/20 text-green-600' : 'hover:bg-muted'
            )}
          >
            <Plus className="h-3 w-3" />
            <span className="font-medium">{summary.added}</span>
            <span className="text-muted-foreground">added</span>
          </button>
          <button
            onClick={() => setFilter(filter === 'removed' ? 'all' : 'removed')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors',
              filter === 'removed' ? 'bg-red-500/20 text-red-600' : 'hover:bg-muted'
            )}
          >
            <Minus className="h-3 w-3" />
            <span className="font-medium">{summary.removed}</span>
            <span className="text-muted-foreground">removed</span>
          </button>
          <button
            onClick={() => setFilter(filter === 'modified' ? 'all' : 'modified')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors',
              filter === 'modified' ? 'bg-amber-500/20 text-amber-600' : 'hover:bg-muted'
            )}
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span className="font-medium">{summary.modified}</span>
            <span className="text-muted-foreground">modified</span>
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {(aiSummary || onGenerateAISummary) && (
        <div className="p-4 border-b border-border">
          {aiSummary ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-primary mb-1">AI Analysis</p>
                <p className="text-sm text-foreground">{aiSummary}</p>
              </div>
            </div>
          ) : onGenerateAISummary && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onGenerateAISummary}
              disabled={isGeneratingAI}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingAI ? 'Analyzing changes...' : 'Generate AI Summary'}
            </Button>
          )}
        </div>
      )}

      {/* View mode toggle */}
      <div className="px-4 py-2 border-b border-border">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'unified' | 'split')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unified">Unified View</TabsTrigger>
            <TabsTrigger value="split">Split View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Diff content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {viewMode === 'unified' ? (
            // Unified view
            filteredDiffs.map((diff, index) => (
              <Collapsible
                key={`${diff.path}-${index}`}
                open={expandedPaths.has(diff.path)}
                onOpenChange={() => toggleExpanded(diff.path)}
              >
                <div className={cn('rounded-lg border', getDiffColor(diff.type))}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors">
                      {expandedPaths.has(diff.path) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {getDiffIcon(diff.type)}
                      <span className="font-mono text-sm flex-1">{diff.path}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {diff.type}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-0 space-y-2">
                      {diff.type === 'modified' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-red-500 font-medium">Old Value</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigator.clipboard.writeText(formatValue(diff.oldValue))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                              {formatValue(diff.oldValue)}
                            </pre>
                          </div>
                          <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-green-500 font-medium">New Value</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => navigator.clipboard.writeText(formatValue(diff.newValue))}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                              {formatValue(diff.newValue)}
                            </pre>
                          </div>
                        </div>
                      ) : diff.type === 'added' ? (
                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-green-500 font-medium">Added Value</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => navigator.clipboard.writeText(formatValue(diff.newValue))}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                            {formatValue(diff.newValue)}
                          </pre>
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-red-500 font-medium">Removed Value</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => navigator.clipboard.writeText(formatValue(diff.oldValue))}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
                            {formatValue(diff.oldValue)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          ) : (
            // Split view
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-center p-2 bg-muted rounded-t-lg border border-border">
                  <p className="text-sm font-medium">
                    v{baseVersion.major_version}.{baseVersion.minor_version}
                  </p>
                </div>
                {filteredDiffs.map((diff, index) => (
                  <div
                    key={`base-${diff.path}-${index}`}
                    className={cn(
                      'p-2 rounded border text-sm',
                      diff.type === 'removed' && 'bg-red-500/10 border-red-500/20',
                      diff.type === 'modified' && 'bg-amber-500/10 border-amber-500/20',
                      diff.type === 'added' && 'opacity-50'
                    )}
                  >
                    <p className="font-mono text-xs text-muted-foreground mb-1">{diff.path}</p>
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {diff.type === 'added' ? '(not present)' : formatValue(diff.oldValue)}
                    </pre>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-center p-2 bg-muted rounded-t-lg border border-border">
                  <p className="text-sm font-medium">
                    v{compareVersion.major_version}.{compareVersion.minor_version}
                  </p>
                </div>
                {filteredDiffs.map((diff, index) => (
                  <div
                    key={`compare-${diff.path}-${index}`}
                    className={cn(
                      'p-2 rounded border text-sm',
                      diff.type === 'added' && 'bg-green-500/10 border-green-500/20',
                      diff.type === 'modified' && 'bg-amber-500/10 border-amber-500/20',
                      diff.type === 'removed' && 'opacity-50'
                    )}
                  >
                    <p className="font-mono text-xs text-muted-foreground mb-1">{diff.path}</p>
                    <pre className="text-xs whitespace-pre-wrap break-all">
                      {diff.type === 'removed' ? '(removed)' : formatValue(diff.newValue)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredDiffs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Equal className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No {filter === 'all' ? 'changes' : filter} found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
