import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { 
  AuditEvent, 
  AuditFilter,
  AuditCategory,
  AUDIT_ACTION_LABELS,
  AUDIT_CATEGORY_COLORS,
  AUDIT_CATEGORY_LABELS,
} from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  User,
  Eye,
  Edit,
  Trash,
  Share,
  Lock,
  Unlock,
  Tag,
  Star,
  Archive,
  Clock,
  RefreshCw,
  MoreHorizontal,
  Copy,
  ExternalLink,
  MessageSquare,
  Shield,
  Settings,
  Brain,
  Printer,
  FolderInput,
  UserPlus,
  UserMinus,
  Activity,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditTimelineProps {
  events: AuditEvent[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onFilter?: (filter: AuditFilter) => void;
  onExport?: (format: 'csv' | 'json') => void;
  showFilters?: boolean;
  showSearch?: boolean;
  maxHeight?: string;
  compact?: boolean;
}

const getActionIcon = (action: string) => {
  if (action.includes('viewed')) return <Eye className="h-4 w-4" />;
  if (action.includes('created')) return <FileText className="h-4 w-4" />;
  if (action.includes('updated') || action.includes('renamed')) return <Edit className="h-4 w-4" />;
  if (action.includes('deleted')) return <Trash className="h-4 w-4" />;
  if (action.includes('shared') || action.includes('unshared')) return <Share className="h-4 w-4" />;
  if (action.includes('locked')) return <Lock className="h-4 w-4" />;
  if (action.includes('unlocked')) return <Unlock className="h-4 w-4" />;
  if (action.includes('tagged') || action.includes('untagged')) return <Tag className="h-4 w-4" />;
  if (action.includes('starred') || action.includes('unstarred')) return <Star className="h-4 w-4" />;
  if (action.includes('archived') || action.includes('unarchived')) return <Archive className="h-4 w-4" />;
  if (action.includes('version')) return <Clock className="h-4 w-4" />;
  if (action.includes('restored')) return <RefreshCw className="h-4 w-4" />;
  if (action.includes('moved') || action.includes('copied')) return <FolderInput className="h-4 w-4" />;
  if (action.includes('downloaded')) return <Download className="h-4 w-4" />;
  if (action.includes('exported')) return <ExternalLink className="h-4 w-4" />;
  if (action.includes('printed')) return <Printer className="h-4 w-4" />;
  if (action.includes('comment')) return <MessageSquare className="h-4 w-4" />;
  if (action.includes('folder')) return <Folder className="h-4 w-4" />;
  if (action.includes('access.granted')) return <UserPlus className="h-4 w-4" />;
  if (action.includes('access.revoked')) return <UserMinus className="h-4 w-4" />;
  if (action.includes('access')) return <Shield className="h-4 w-4" />;
  if (action.includes('user')) return <User className="h-4 w-4" />;
  if (action.includes('ai') || action.includes('processed')) return <Brain className="h-4 w-4" />;
  if (action.includes('system') || action.includes('settings')) return <Settings className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
};

const getActionColor = (action: string): string => {
  if (action.includes('deleted')) return 'text-red-500 bg-red-50 dark:bg-red-950';
  if (action.includes('created')) return 'text-green-500 bg-green-50 dark:bg-green-950';
  if (action.includes('shared') || action.includes('access.granted')) return 'text-blue-500 bg-blue-50 dark:bg-blue-950';
  if (action.includes('locked') || action.includes('security')) return 'text-amber-500 bg-amber-50 dark:bg-amber-950';
  if (action.includes('ai') || action.includes('processed')) return 'text-purple-500 bg-purple-50 dark:bg-purple-950';
  if (action.includes('viewed')) return 'text-slate-500 bg-slate-50 dark:bg-slate-950';
  return 'text-primary bg-primary/10';
};

const AuditTimeline: React.FC<AuditTimelineProps> = ({
  events,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onFilter,
  onExport,
  showFilters = true,
  showSearch = true,
  maxHeight = '600px',
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Group events by date
  const groupedEvents = useMemo(() => {
    const filtered = events.filter(event => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesAction = AUDIT_ACTION_LABELS[event.action]?.toLowerCase().includes(query);
        const matchesResource = event.resource_name?.toLowerCase().includes(query);
        const matchesUser = event.user?.name?.toLowerCase().includes(query) || 
                           event.user?.email?.toLowerCase().includes(query);
        if (!matchesAction && !matchesResource && !matchesUser) return false;
      }
      if (selectedCategory !== 'all' && event.action_category !== selectedCategory) return false;
      return true;
    });

    const groups: Record<string, AuditEvent[]> = {};
    
    filtered.forEach(event => {
      const date = new Date(event.created_at);
      let label: string;
      
      if (isToday(date)) label = 'Today';
      else if (isYesterday(date)) label = 'Yesterday';
      else if (isThisWeek(date)) label = format(date, 'EEEE');
      else label = format(date, 'MMMM d, yyyy');
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(event);
    });

    return groups;
  }, [events, searchQuery, selectedCategory]);

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const handleApplyFilter = () => {
    onFilter?.({
      searchQuery,
      categories: selectedCategory !== 'all' ? [selectedCategory as AuditCategory] : undefined,
      startDate: dateRange.from,
      endDate: dateRange.to,
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setDateRange({});
    onFilter?.({});
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || dateRange.from || dateRange.to;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Activity Trail
          </CardTitle>
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Filters */}
        {(showFilters || showSearch) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {showSearch && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}

            {showFilters && (
              <>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[160px] h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(AUDIT_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: AUDIT_CATEGORY_COLORS[key as AuditCategory] }}
                          />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                          </>
                        ) : (
                          format(dateRange.from, 'MMM d, yyyy')
                        )
                      ) : (
                        'Date range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="px-4 pb-4">
            {isLoading && events.length === 0 ? (
              // Loading skeleton
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : Object.keys(groupedEvents).length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">No activity found</p>
                <p className="text-xs">Activity will appear here as actions are performed</p>
              </div>
            ) : (
              // Timeline
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
                  <div key={dateLabel}>
                    <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        {dateLabel}
                      </h3>
                    </div>
                    <div className="relative pl-6 border-l-2 border-muted space-y-4">
                      <AnimatePresence>
                        {dayEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative"
                          >
                            {/* Timeline dot */}
                            <div
                              className={`absolute -left-[25px] p-1.5 rounded-full ${getActionColor(event.action)}`}
                            >
                              {getActionIcon(event.action)}
                            </div>

                            {/* Event card */}
                            <div
                              className={`ml-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer ${
                                compact ? 'py-2' : ''
                              }`}
                              onClick={() => toggleExpanded(event.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">
                                      {AUDIT_ACTION_LABELS[event.action] || event.action}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                      style={{
                                        borderColor: AUDIT_CATEGORY_COLORS[event.action_category],
                                        color: AUDIT_CATEGORY_COLORS[event.action_category],
                                      }}
                                    >
                                      {AUDIT_CATEGORY_LABELS[event.action_category]}
                                    </Badge>
                                  </div>
                                  {event.resource_name && (
                                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                      {event.resource_name}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(event.created_at), 'HH:mm')}
                                  </span>
                                  {event.details && Object.keys(event.details).length > 0 && (
                                    <ChevronRight
                                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                                        expandedEvents.has(event.id) ? 'rotate-90' : ''
                                      }`}
                                    />
                                  )}
                                </div>
                              </div>

                              {/* User info */}
                              {!compact && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={event.user?.avatar_url} />
                                    <AvatarFallback className="text-[10px]">
                                      {event.user?.name?.charAt(0) || event.user?.email?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    {event.user?.name || event.user?.email || 'Unknown user'}
                                  </span>
                                </div>
                              )}

                              {/* Expanded details */}
                              <AnimatePresence>
                                {expandedEvents.has(event.id) && event.details && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 pt-3 border-t border-border"
                                  >
                                    <div className="space-y-2 text-xs">
                                      {event.details.changes && (
                                        <div>
                                          <span className="font-medium">Changes:</span>
                                          <ul className="mt-1 space-y-1">
                                            {event.details.changes.map((change, i) => (
                                              <li key={i} className="flex gap-2">
                                                <span className="text-muted-foreground">{change.field}:</span>
                                                <span className="line-through text-red-500">{String(change.old_value)}</span>
                                                <span>→</span>
                                                <span className="text-green-500">{String(change.new_value)}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {event.details.shared_with && (
                                        <div>
                                          <span className="font-medium">Shared with:</span>
                                          <span className="ml-2">{event.details.shared_with.join(', ')}</span>
                                        </div>
                                      )}
                                      {event.details.reason && (
                                        <div>
                                          <span className="font-medium">Reason:</span>
                                          <span className="ml-2">{event.details.reason}</span>
                                        </div>
                                      )}
                                      {event.metadata && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {event.metadata.device_type && (
                                            <Badge variant="secondary" className="text-[10px]">
                                              {event.metadata.device_type}
                                            </Badge>
                                          )}
                                          {event.metadata.browser && (
                                            <Badge variant="secondary" className="text-[10px]">
                                              {event.metadata.browser}
                                            </Badge>
                                          )}
                                          {event.metadata.os && (
                                            <Badge variant="secondary" className="text-[10px]">
                                              {event.metadata.os}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center py-4">
                    <Button
                      variant="outline"
                      onClick={onLoadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      )}
                      Load more
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AuditTimeline;
