import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Sparkles, 
  Clock, 
  Brain,
  X,
  TrendingUp,
  FileText,
  Tag,
  Calendar,
  Loader2,
  Mic,
  Command,
  Filter,
  Zap,
  ArrowRight,
  History,
  Lightbulb
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AISearchBarProps {
  onSearch: (query: string) => Promise<void>;
  onClear: () => void;
  isSearching?: boolean;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  id: string;
  type: 'ai' | 'recent' | 'popular' | 'example' | 'filter';
  text: string;
  description?: string;
  icon: React.ReactNode;
  tags?: string[];
}

const EXAMPLE_QUERIES = [
  { text: "invoices from last month", description: "Financial documents with date filter" },
  { text: "contracts with John Smith", description: "Search by recipient/sender" },
  { text: "expense receipts for reimbursement", description: "Expense tracking" },
  { text: "all PDFs from this week", description: "File type + date filter" },
  { text: "tax documents 2024", description: "Tax-related files" },
  { text: "important medical records", description: "Health documents" },
  { text: "resumes and job applications", description: "HR documents" },
  { text: "purchase orders over $1000", description: "Financial filtering" }
];

const QUICK_FILTERS = [
  { label: "Invoices", query: "all invoices" },
  { label: "Contracts", query: "contracts and agreements" },
  { label: "Recent", query: "documents from this week" },
  { label: "PDFs", query: "all PDF files" },
  { label: "Images", query: "image files" }
];

export const AISearchBar: React.FC<AISearchBarProps> = ({
  onSearch,
  onClear,
  isSearching = false,
  placeholder = "Ask AI to find documents...",
  className
}) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem('ai_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (query.length > 1) {
      generateSmartSuggestions(query);
    } else {
      generateDefaultSuggestions();
    }
    setSelectedIndex(-1);
  }, [query, recentSearches]);

  const generateSmartSuggestions = (searchQuery: string) => {
    const smartSuggestions: SearchSuggestion[] = [
      {
        id: 'ai-search',
        type: 'ai',
        text: searchQuery,
        description: 'AI-powered natural language search',
        icon: <Brain className="w-4 h-4 text-primary" />
      }
    ];

    // Add contextual suggestions based on query
    const lowerQuery = searchQuery.toLowerCase();
    
    if (lowerQuery.includes('invoice') || lowerQuery.includes('bill')) {
      smartSuggestions.push({
        id: 'filter-invoice',
        type: 'filter',
        text: `${searchQuery} from last month`,
        description: 'Add time filter',
        icon: <Calendar className="w-4 h-4 text-blue-500" />
      });
    }

    if (!lowerQuery.includes('from') && !lowerQuery.includes('last') && !lowerQuery.includes('this')) {
      smartSuggestions.push({
        id: 'filter-recent',
        type: 'filter',
        text: `${searchQuery} from this month`,
        description: 'Recent documents only',
        icon: <Clock className="w-4 h-4 text-amber-500" />
      });
    }

    // Match against examples
    const matchingExamples = EXAMPLE_QUERIES
      .filter(ex => ex.text.toLowerCase().includes(lowerQuery) || lowerQuery.includes(ex.text.split(' ')[0]))
      .slice(0, 2)
      .map((ex, i) => ({
        id: `example-${i}`,
        type: 'example' as const,
        text: ex.text,
        description: ex.description,
        icon: <Lightbulb className="w-4 h-4 text-yellow-500" />
      }));

    setSuggestions([...smartSuggestions, ...matchingExamples]);
  };

  const generateDefaultSuggestions = () => {
    const defaultSuggestions: SearchSuggestion[] = [];

    // Add recent searches
    recentSearches.slice(0, 3).forEach((search, i) => {
      defaultSuggestions.push({
        id: `recent-${i}`,
        type: 'recent',
        text: search,
        description: 'Recent search',
        icon: <History className="w-4 h-4 text-muted-foreground" />
      });
    });

    // Add example queries
    EXAMPLE_QUERIES.slice(0, 4).forEach((ex, i) => {
      defaultSuggestions.push({
        id: `example-${i}`,
        type: 'example',
        text: ex.text,
        description: ex.description,
        icon: <Lightbulb className="w-4 h-4 text-yellow-500" />
      });
    });

    setSuggestions(defaultSuggestions);
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Save to recent searches
    const updatedRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updatedRecent);
    localStorage.setItem('ai_recent_searches', JSON.stringify(updatedRecent));

    setIsExpanded(false);
    inputRef.current?.blur();

    await onSearch(searchQuery);
  }, [recentSearches, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSearch(suggestions[selectedIndex].text);
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    onClear();
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main Search Input */}
      <div className="relative">
        <div className={cn(
          "relative flex items-center rounded-xl border-2 transition-all duration-200",
          isExpanded ? "border-primary shadow-lg shadow-primary/10" : "border-border",
          isSearching && "border-primary/50"
        )}>
          <div className="absolute left-4 flex items-center gap-2">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Brain className="w-5 h-5 text-primary" />
            )}
          </div>
          
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            disabled={isSearching}
            className={cn(
              "pl-12 pr-24 py-6 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
              isSearching && "opacity-70"
            )}
          />

          <div className="absolute right-3 flex items-center gap-2">
            {query && !isSearching && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => handleSearch(query)}
              disabled={isSearching || !query.trim()}
              size="sm"
              className="h-8 px-3 rounded-full"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI Badge */}
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background">
          <Badge variant="secondary" className="text-xs font-medium">
            <Sparkles className="w-3 h-3 mr-1 text-primary" />
            AI-Powered Search
          </Badge>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Quick:</span>
        {QUICK_FILTERS.map((filter, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="h-7 text-xs rounded-full"
            onClick={() => {
              setQuery(filter.query);
              handleSearch(filter.query);
            }}
            disabled={isSearching}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Search Suggestions Dropdown */}
      {isExpanded && !isSearching && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-2 overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    {query ? 'Smart Suggestions' : 'Try searching for...'}
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSearch(suggestion.text)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                        selectedIndex === index ? "bg-primary/10" : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        suggestion.type === 'ai' ? "bg-primary/10" : "bg-muted"
                      )}>
                        {suggestion.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {suggestion.text}
                        </div>
                        {suggestion.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {suggestion.description}
                          </div>
                        )}
                      </div>
                      {suggestion.type === 'ai' && (
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          <Brain className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Tips */}
              <Separator />
              <div className="p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Search Tips:
                  </p>
                  <p>• Use natural language: "invoices from last month"</p>
                  <p>• Filter by type: "contracts", "receipts", "tax documents"</p>
                  <p>• Add time: "this week", "last year", "recent"</p>
                  <p>• Press Enter to search or ↑↓ to navigate</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};
