import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Upload, 
  SortAsc, 
  Grid, 
  List, 
  Brain,
  Scan,
  Cloud,
  CloudOff,
  MessageSquare
} from 'lucide-react';
import type { DocumentStats, ViewMode, SortOrder } from '../types';

interface SimplifyDriveHeaderProps {
  stats: DocumentStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  aiInsightsEnabled: boolean;
  onAiInsightsToggle: () => void;
  onUpload: () => void;
  onScan: () => void;
  onChatbot?: () => void;
  isOnline: boolean;
}

export function SimplifyDriveHeader({
  stats,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  aiInsightsEnabled,
  onAiInsightsToggle,
  onUpload,
  onScan,
  onChatbot,
  isOnline,
}: SimplifyDriveHeaderProps) {
  return (
    <div className="space-y-4 p-4 border-b bg-background">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <div className="text-xs text-muted-foreground">Total Documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.processedDocs}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.totalSize}</div>
            <div className="text-xs text-muted-foreground">Storage Used</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-2xl font-bold">{stats.avgImportance}</div>
            <div className="text-xs text-muted-foreground">Avg. Importance</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[140px]">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="importance">Importance</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <SortAsc className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </Button>

        {/* View Mode */}
        <div className="flex items-center border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Toggle */}
        <Button
          variant={aiInsightsEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={onAiInsightsToggle}
          className="gap-2"
        >
          <Brain className="h-4 w-4" />
          AI Insights
        </Button>

        {/* Online Status */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-destructive" />
          )}
        </div>

        {/* Upload Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {onChatbot && (
            <Button variant="outline" onClick={onChatbot} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              RAG Chat
            </Button>
          )}
          <Button variant="outline" onClick={onScan} className="gap-2">
            <Scan className="h-4 w-4" />
            Scan
          </Button>
          <Button onClick={onUpload} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
