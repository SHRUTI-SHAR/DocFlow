import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Calendar as CalendarIcon, FileText, Image, Table, 
  Archive, Code, Folder, User, Tag, X, RotateCcw
} from 'lucide-react';
import { SearchFilters, DateRangePreset, FILE_TYPE_CATEGORIES } from '@/types/search';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchFiltersPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom range' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'draft', label: 'Draft' },
  { value: 'locked', label: 'Locked' }
];

export const SearchFiltersPanel: React.FC<SearchFiltersPanelProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  className
}) => {
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>();
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>();

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleFileType = (type: string) => {
    const current = filters.fileTypes || [];
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type];
    updateFilter('fileTypes', updated.length > 0 ? updated : undefined);
  };

  const toggleStatus = (status: 'active' | 'archived' | 'draft' | 'locked') => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    updateFilter('status', updated.length > 0 ? updated : undefined);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange) count++;
    if (filters.fileTypes?.length) count++;
    if (filters.status?.length) count++;
    if (filters.folderId) count++;
    if (filters.tags?.length) count++;
    if (filters.minSize || filters.maxSize) count++;
    if (filters.ownerId) count++;
    return count;
  };

  const getFileTypeIcon = (category: string) => {
    switch (category) {
      case 'documents': return FileText;
      case 'spreadsheets': return Table;
      case 'images': return Image;
      case 'archives': return Archive;
      case 'code': return Code;
      default: return FileText;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base font-medium">Filters</CardTitle>
        <div className="flex items-center gap-2">
          {getActiveFiltersCount() > 0 && (
            <>
              <Badge variant="secondary">
                {getActiveFiltersCount()} active
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8 gap-1 text-muted-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Accordion type="multiple" defaultValue={['date', 'type']} className="px-4">
            {/* Date Range */}
            <AccordionItem value="date">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Select
                    value={filters.dateRange || ''}
                    onValueChange={(value) => updateFilter('dateRange', value as DateRangePreset || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {filters.dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left text-xs">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {customDateStart ? format(customDateStart, 'PP') : 'Start date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={customDateStart}
                            onSelect={(date) => {
                              setCustomDateStart(date);
                              if (date) updateFilter('customDateStart', date.toISOString());
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left text-xs">
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {customDateEnd ? format(customDateEnd, 'PP') : 'End date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={customDateEnd}
                            onSelect={(date) => {
                              setCustomDateEnd(date);
                              if (date) updateFilter('customDateEnd', date.toISOString());
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* File Type */}
            <AccordionItem value="type">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  File Type
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {Object.entries(FILE_TYPE_CATEGORIES).map(([key, config]) => {
                    const Icon = getFileTypeIcon(key);
                    const isSelected = config.extensions.some(ext => 
                      filters.fileTypes?.includes(ext)
                    );

                    return (
                      <div key={key} className="space-y-1">
                        <button
                          onClick={() => {
                            if (isSelected) {
                              const updated = (filters.fileTypes || []).filter(
                                t => !config.extensions.includes(t)
                              );
                              updateFilter('fileTypes', updated.length > 0 ? updated : undefined);
                            } else {
                              updateFilter('fileTypes', [
                                ...(filters.fileTypes || []),
                                ...config.extensions
                              ]);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-md text-sm transition-colors",
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {config.extensions.length}
                            </Badge>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Status */}
            <AccordionItem value="status">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Status
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((status) => (
                    <div key={status.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.status?.includes(status.value as any) || false}
                        onCheckedChange={() => toggleStatus(status.value as any)}
                      />
                      <Label 
                        htmlFor={`status-${status.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Size */}
            <AccordionItem value="size">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Size
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Size</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          placeholder="0"
                          className="h-8 text-sm"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            const multiplier = filters.sizeUnit === 'GB' ? 1024 * 1024 * 1024 :
                                             filters.sizeUnit === 'MB' ? 1024 * 1024 : 1024;
                            updateFilter('minSize', value ? value * multiplier : undefined);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Size</Label>
                      <Input
                        type="number"
                        placeholder="∞"
                        className="h-8 text-sm"
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          const multiplier = filters.sizeUnit === 'GB' ? 1024 * 1024 * 1024 :
                                           filters.sizeUnit === 'MB' ? 1024 * 1024 : 1024;
                          updateFilter('maxSize', value ? value * multiplier : undefined);
                        }}
                      />
                    </div>
                  </div>
                  <Select
                    value={filters.sizeUnit || 'MB'}
                    onValueChange={(value) => updateFilter('sizeUnit', value as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KB">KB</SelectItem>
                      <SelectItem value="MB">MB</SelectItem>
                      <SelectItem value="GB">GB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Location */}
            <AccordionItem value="location">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Location
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Input
                    placeholder="Folder ID or name"
                    className="h-8 text-sm"
                    value={filters.folderId || ''}
                    onChange={(e) => updateFilter('folderId', e.target.value || undefined)}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-subfolders"
                      checked={filters.includeSubfolders || false}
                      onCheckedChange={(checked) => updateFilter('includeSubfolders', !!checked)}
                    />
                    <Label htmlFor="include-subfolders" className="text-sm cursor-pointer">
                      Include subfolders
                    </Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Owner */}
            <AccordionItem value="owner">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Input
                    placeholder="Owner email"
                    className="h-8 text-sm"
                    value={filters.ownerId || ''}
                    onChange={(e) => updateFilter('ownerId', e.target.value || undefined)}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="shared-with-me"
                      checked={filters.sharedWithMe || false}
                      onCheckedChange={(checked) => updateFilter('sharedWithMe', !!checked)}
                    />
                    <Label htmlFor="shared-with-me" className="text-sm cursor-pointer">
                      Shared with me
                    </Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tags */}
            <AccordionItem value="tags">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <Input
                    placeholder="Add tags (comma separated)"
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const value = (e.target as HTMLInputElement).value;
                        const newTags = value.split(',').map(t => t.trim()).filter(Boolean);
                        updateFilter('tags', [...(filters.tags || []), ...newTags]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  
                  {filters.tags && filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {filters.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            onClick={() => {
                              const updated = filters.tags?.filter((_, i) => i !== index);
                              updateFilter('tags', updated?.length ? updated : undefined);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Match:</Label>
                    <Select
                      value={filters.tagMatchMode || 'any'}
                      onValueChange={(value) => updateFilter('tagMatchMode', value as any)}
                    >
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
