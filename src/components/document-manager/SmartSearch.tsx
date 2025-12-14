import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  Sparkles, 
  Clock, 
  Brain,
  X,
  TrendingUp,
  FileText,
  Tag,
  Calendar
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SmartSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSemanticSearch: (query: string) => void;
}

interface SearchSuggestion {
  type: 'semantic' | 'recent' | 'popular' | 'smart';
  text: string;
  description?: string;
  icon: React.ReactNode;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  query,
  onQueryChange,
  onSemanticSearch
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      generateSmartSuggestions(query);
    } else {
      generateDefaultSuggestions();
    }
  }, [query]);

  const generateSmartSuggestions = (searchQuery: string) => {
    const smartSuggestions: SearchSuggestion[] = [
      {
        type: 'semantic',
        text: `Find documents similar to "${searchQuery}"`,
        description: 'AI-powered semantic search',
        icon: <Brain className="w-4 h-4 text-blue-500" />
      },
      {
        type: 'smart',
        text: `${searchQuery} in contracts`,
        description: 'Search within contract documents',
        icon: <FileText className="w-4 h-4 text-green-500" />
      },
      {
        type: 'smart',
        text: `${searchQuery} from last month`,
        description: 'Recent documents only',
        icon: <Calendar className="w-4 h-4 text-purple-500" />
      }
    ];

    setSuggestions(smartSuggestions);
  };

  const generateDefaultSuggestions = () => {
    const defaultSuggestions: SearchSuggestion[] = [
      {
        type: 'popular',
        text: 'contracts',
        description: 'Most searched category',
        icon: <TrendingUp className="w-4 h-4 text-orange-500" />
      },
      {
        type: 'popular',
        text: 'invoices',
        description: 'Financial documents',
        icon: <TrendingUp className="w-4 h-4 text-orange-500" />
      },
      {
        type: 'smart',
        text: 'documents from this week',
        description: 'Recently uploaded',
        icon: <Clock className="w-4 h-4 text-blue-500" />
      },
      {
        type: 'smart',
        text: 'high importance documents',
        description: 'AI-ranked important docs',
        icon: <Sparkles className="w-4 h-4 text-yellow-500" />
      }
    ];

    // Add recent searches
    const recentSuggestions = recentSearches.slice(0, 3).map(search => ({
      type: 'recent' as const,
      text: search,
      description: 'Recent search',
      icon: <Clock className="w-4 h-4 text-gray-500" />
    }));

    setSuggestions([...recentSuggestions, ...defaultSuggestions]);
  };

  const handleSearch = async (searchQuery: string, semantic = false) => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    const updatedRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updatedRecent);
    localStorage.setItem('recent_searches', JSON.stringify(updatedRecent));

    if (semantic) {
      await onSemanticSearch(searchQuery);
      toast({
        title: "AI Search Activated",
        description: "Using semantic search to find relevant documents",
      });
    } else {
      onQueryChange(searchQuery);
    }

    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query, isSemanticMode);
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  const toggleSemanticMode = () => {
    setIsSemanticMode(!isSemanticMode);
    if (!isSemanticMode) {
      toast({
        title: "AI Search Mode",
        description: "Semantic search will find documents by meaning, not just keywords",
      });
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={isSemanticMode ? "Ask AI to find documents..." : "Search documents..."}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              className={`pl-10 pr-20 ${isSemanticMode ? 'border-blue-300 bg-blue-50/50' : ''}`}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant={isSemanticMode ? "default" : "ghost"}
                size="sm"
                onClick={toggleSemanticMode}
                className="h-6 px-2"
              >
                <Brain className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {isSemanticMode && (
          <div className="mt-1">
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Semantic Search Active
            </Badge>
          </div>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {isExpanded && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {suggestions.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    Smart Suggestions
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(suggestion.text, suggestion.type === 'semantic')}
                      className="w-full flex items-center gap-3 p-2 hover:bg-muted rounded-lg text-left transition-colors"
                    >
                      {suggestion.icon}
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
                      {suggestion.type === 'semantic' && (
                        <Badge variant="secondary" className="text-xs">
                          AI
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {query.length > 2 && (
                <div className="border-t p-2">
                  <Button
                    onClick={() => handleSearch(query, true)}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Search with AI: "{query}"
                  </Button>
                </div>
              )}

              {recentSearches.length > 0 && query.length === 0 && (
                <div className="border-t p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                    Recent Searches
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => handleSearch(search)}
                      >
                        {search}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
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