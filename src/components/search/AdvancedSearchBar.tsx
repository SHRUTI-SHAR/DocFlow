import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { 
  Search, X, Clock, Bookmark, Command as CommandIcon,
  ChevronDown, Filter, HelpCircle, Sparkles
} from 'lucide-react';
import { SearchSuggestion, SEARCH_OPERATORS } from '@/types/search';
import { cn } from '@/lib/utils';

interface AdvancedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  onHideSuggestions?: () => void;
  onFilterClick?: () => void;
  activeFiltersCount?: number;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  suggestions = [],
  showSuggestions = false,
  onSelectSuggestion,
  onHideSuggestions,
  onFilterClick,
  activeFiltersCount = 0,
  placeholder = 'Search documents... (use operators like AND, OR, "phrase")',
  className,
  isLoading = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
      onHideSuggestions?.();
    } else if (e.key === 'Escape') {
      onHideSuggestions?.();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  const insertOperator = (operator: string) => {
    const newValue = value ? `${value} ${operator}` : operator;
    onChange(newValue);
    inputRef.current?.focus();
    setShowHelp(false);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'saved': return <Bookmark className="h-4 w-4 text-primary" />;
      case 'operator': return <CommandIcon className="h-4 w-4 text-chart-3" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "flex items-center gap-2 border rounded-lg transition-all",
        isFocused ? "ring-2 ring-primary/20 border-primary" : "border-border",
        "bg-background"
      )}>
        {/* Search Icon */}
        <div className="pl-3">
          {isLoading ? (
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Input */}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        />

        {/* Clear button */}
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Help button */}
        <Popover open={showHelp} onOpenChange={setShowHelp}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="p-4 border-b">
              <h4 className="font-semibold">Search Operators</h4>
              <p className="text-sm text-muted-foreground">
                Use these operators for advanced searches
              </p>
            </div>
            <ScrollArea className="h-80">
              <div className="p-2 space-y-1">
                {SEARCH_OPERATORS.map((op, index) => (
                  <button
                    key={index}
                    onClick={() => insertOperator(op.syntax)}
                    className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {op.syntax}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {op.operator}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{op.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Example: <code className="text-foreground">{op.example}</code>
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Filter button */}
        {onFilterClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onFilterClick}
            className="gap-2 mr-1"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}

        {/* Search button */}
        <Button onClick={onSearch} className="rounded-l-none" disabled={isLoading}>
          Search
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50">
          <Command>
            <CommandList>
              <CommandEmpty>No suggestions</CommandEmpty>
              
              {/* Recent searches */}
              {suggestions.some(s => s.type === 'recent') && (
                <CommandGroup heading="Recent">
                  {suggestions.filter(s => s.type === 'recent').map((suggestion, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      onSelect={() => onSelectSuggestion?.(suggestion)}
                      className="cursor-pointer"
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="ml-2">{suggestion.label}</span>
                      {suggestion.description && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {suggestion.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Saved searches */}
              {suggestions.some(s => s.type === 'saved') && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Saved">
                    {suggestions.filter(s => s.type === 'saved').map((suggestion, index) => (
                      <CommandItem
                        key={`saved-${index}`}
                        onSelect={() => onSelectSuggestion?.(suggestion)}
                        className="cursor-pointer"
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="ml-2 font-medium">{suggestion.label}</span>
                        {suggestion.description && (
                          <span className="ml-2 text-xs text-muted-foreground truncate">
                            {suggestion.description}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Operators */}
              {suggestions.some(s => s.type === 'operator') && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Operators">
                    {suggestions.filter(s => s.type === 'operator').map((suggestion, index) => (
                      <CommandItem
                        key={`operator-${index}`}
                        onSelect={() => onSelectSuggestion?.(suggestion)}
                        className="cursor-pointer"
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <code className="ml-2 text-sm">{suggestion.value}</code>
                        {suggestion.description && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {suggestion.description}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
