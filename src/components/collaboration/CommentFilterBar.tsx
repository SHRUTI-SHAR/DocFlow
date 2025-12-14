import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Search, Filter, SortAsc, SortDesc, X, CheckCircle,
  Circle, Ban, Flag, User, Tag, Calendar as CalendarIcon,
  AtSign, Paperclip
} from 'lucide-react';
import { CommentFilter, CommentSortOption, PRIORITY_CONFIG } from '@/types/annotations';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CommentFilterBarProps {
  filter: CommentFilter;
  onFilterChange: (filter: CommentFilter) => void;
  sortOption: CommentSortOption;
  onSortChange: (sort: CommentSortOption) => void;
  stats: {
    total: number;
    open: number;
    resolved: number;
    myMentions: number;
    assignedToMe: number;
  };
  availableLabels?: Array<{ id: string; name: string; color: string }>;
  availableAuthors?: Array<{ id: string; name?: string; email?: string }>;
}

export const CommentFilterBar: React.FC<CommentFilterBarProps> = ({
  filter,
  onFilterChange,
  sortOption,
  onSortChange,
  stats,
  availableLabels = [],
  availableAuthors = []
}) => {
  const hasActiveFilters = 
    (filter.status && filter.status.length > 0) ||
    (filter.priority && filter.priority.length > 0) ||
    (filter.labels && filter.labels.length > 0) ||
    (filter.authors && filter.authors.length > 0) ||
    filter.assignedToMe ||
    filter.mentionsMe ||
    filter.hasAttachments ||
    filter.dateRange ||
    filter.searchQuery;

  const clearFilters = () => {
    onFilterChange({});
  };

  const toggleStatus = (status: 'open' | 'resolved' | 'wontfix') => {
    const current = filter.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange({ ...filter, status: updated.length ? updated : undefined });
  };

  const togglePriority = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const current = filter.priority || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFilterChange({ ...filter, priority: updated.length ? updated : undefined });
  };

  return (
    <div className="space-y-2">
      {/* Search and quick filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={filter.searchQuery || ''}
            onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value || undefined })}
            placeholder="Search comments..."
            className="pl-9 h-9"
          />
          {filter.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onFilterChange({ ...filter, searchQuery: undefined })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Circle className="h-3 w-3" />
              Status
              {filter.status?.length ? (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {filter.status.length}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              checked={filter.status?.includes('open')}
              onCheckedChange={() => toggleStatus('open')}
            >
              <Circle className="h-3 w-3 mr-2 text-blue-500" />
              Open ({stats.open})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter.status?.includes('resolved')}
              onCheckedChange={() => toggleStatus('resolved')}
            >
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
              Resolved ({stats.resolved})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter.status?.includes('wontfix')}
              onCheckedChange={() => toggleStatus('wontfix')}
            >
              <Ban className="h-3 w-3 mr-2 text-muted-foreground" />
              Won't Fix
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Flag className="h-3 w-3" />
              Priority
              {filter.priority?.length ? (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {filter.priority.length}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={filter.priority?.includes(key as any)}
                onCheckedChange={() => togglePriority(key as any)}
                className={cn(config.color)}
              >
                {config.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-3 w-3" />
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filter.assignedToMe}
              onCheckedChange={(checked) => onFilterChange({ ...filter, assignedToMe: checked || undefined })}
            >
              <User className="h-3 w-3 mr-2" />
              Assigned to me ({stats.assignedToMe})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter.mentionsMe}
              onCheckedChange={(checked) => onFilterChange({ ...filter, mentionsMe: checked || undefined })}
            >
              <AtSign className="h-3 w-3 mr-2" />
              Mentions me ({stats.myMentions})
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filter.hasAttachments}
              onCheckedChange={(checked) => onFilterChange({ ...filter, hasAttachments: checked || undefined })}
            >
              <Paperclip className="h-3 w-3 mr-2" />
              Has attachments
            </DropdownMenuCheckboxItem>
            
            {availableLabels.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Labels</DropdownMenuLabel>
                {availableLabels.map((label) => (
                  <DropdownMenuCheckboxItem
                    key={label.id}
                    checked={filter.labels?.includes(label.name)}
                    onCheckedChange={(checked) => {
                      const current = filter.labels || [];
                      const updated = checked
                        ? [...current, label.name]
                        : current.filter(l => l !== label.name);
                      onFilterChange({ ...filter, labels: updated.length ? updated : undefined });
                    }}
                  >
                    <div 
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <CalendarIcon className="h-3 w-3" />
              {filter.dateRange ? (
                <span className="text-xs">
                  {format(new Date(filter.dateRange.start), 'MMM d')} - {format(new Date(filter.dateRange.end), 'MMM d')}
                </span>
              ) : (
                'Date'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: filter.dateRange ? new Date(filter.dateRange.start) : undefined,
                to: filter.dateRange ? new Date(filter.dateRange.end) : undefined,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  onFilterChange({
                    ...filter,
                    dateRange: {
                      start: range.from.toISOString(),
                      end: range.to.toISOString(),
                    },
                  });
                } else {
                  onFilterChange({ ...filter, dateRange: undefined });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6" />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              {sortOption.direction === 'asc' ? (
                <SortAsc className="h-3 w-3" />
              ) : (
                <SortDesc className="h-3 w-3" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={sortOption.field === 'created_at'}
              onCheckedChange={() => onSortChange({ ...sortOption, field: 'created_at' })}
            >
              Date created
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOption.field === 'updated_at'}
              onCheckedChange={() => onSortChange({ ...sortOption, field: 'updated_at' })}
            >
              Last updated
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOption.field === 'priority'}
              onCheckedChange={() => onSortChange({ ...sortOption, field: 'priority' })}
            >
              Priority
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOption.field === 'reply_count'}
              onCheckedChange={() => onSortChange({ ...sortOption, field: 'reply_count' })}
            >
              Most replies
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortOption.direction === 'desc'}
              onCheckedChange={() => onSortChange({ ...sortOption, direction: sortOption.direction === 'asc' ? 'desc' : 'asc' })}
            >
              {sortOption.direction === 'asc' ? 'Ascending' : 'Descending'}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 text-muted-foreground"
            onClick={clearFilters}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          
          {filter.status?.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1 h-6">
              {status}
              <button onClick={() => toggleStatus(status)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filter.priority?.map((priority) => (
            <Badge key={priority} variant="secondary" className="gap-1 h-6">
              {priority} priority
              <button onClick={() => togglePriority(priority)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filter.assignedToMe && (
            <Badge variant="secondary" className="gap-1 h-6">
              Assigned to me
              <button onClick={() => onFilterChange({ ...filter, assignedToMe: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          {filter.mentionsMe && (
            <Badge variant="secondary" className="gap-1 h-6">
              Mentions me
              <button onClick={() => onFilterChange({ ...filter, mentionsMe: undefined })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentFilterBar;
