import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { 
  Search, Filter, Bookmark, Clock, Grid, List,
  SlidersHorizontal
} from 'lucide-react';
import { AdvancedSearchBar } from './AdvancedSearchBar';
import { SearchFiltersPanel } from './SearchFiltersPanel';
import { SearchResultsList } from './SearchResultsList';
import { SavedSearchesList } from './SavedSearchesList';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import { cn } from '@/lib/utils';

interface AdvancedSearchPageProps {
  className?: string;
}

export const AdvancedSearchPage: React.FC<AdvancedSearchPageProps> = ({
  className
}) => {
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const {
    query,
    parsedQuery,
    filters,
    results,
    isLoading,
    totalCount,
    hasMore,
    executionTimeMs,
    suggestions,
    showSuggestions,
    recentSearches,
    savedSearches,
    sortField,
    sortDirection,
    setQuery,
    setFilters,
    clearFilters,
    search,
    loadMore,
    setSortField,
    setSortDirection,
    selectSuggestion,
    hideSuggestions,
    saveSearch,
    deleteSavedSearch,
    loadSavedSearch,
    clearHistory,
    getOperatorHelp
  } = useAdvancedSearch({
    pageSize: 20,
    enableSuggestions: true,
    enableHistory: true
  });

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const handleResultClick = (result: any) => {
    // Navigate to document or open preview
    console.log('Opening result:', result.id);
  };

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Search Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">Advanced Search</h1>
            </div>
          </div>

          <AdvancedSearchBar
            value={query}
            onChange={setQuery}
            onSearch={search}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onSelectSuggestion={selectSuggestion}
            onHideSuggestions={hideSuggestions}
            onFilterClick={() => setShowFilters(!showFilters)}
            activeFiltersCount={activeFiltersCount}
            isLoading={isLoading}
          />

          {/* Active filters preview */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              
              {filters.dateRange && (
                <Badge variant="secondary" className="gap-1">
                  Date: {filters.dateRange.replace('_', ' ')}
                </Badge>
              )}
              
              {filters.fileTypes && filters.fileTypes.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Types: {filters.fileTypes.length}
                </Badge>
              )}
              
              {filters.status && filters.status.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status.join(', ')}
                </Badge>
              )}

              {filters.tags && filters.tags.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Tags: {filters.tags.length}
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-4 overflow-hidden">
        <div className="flex gap-4 h-full">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-72 shrink-0 hidden lg:block">
              <SearchFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
              />
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0 overflow-auto">
            <SearchResultsList
              results={results}
              isLoading={isLoading}
              totalCount={totalCount}
              executionTimeMs={executionTimeMs}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortFieldChange={setSortField}
              onSortDirectionChange={setSortDirection}
              onResultClick={handleResultClick}
              onLoadMore={loadMore}
              hasMore={hasMore}
              highlightTerms={parsedQuery?.tokens
                .filter(t => t.type === 'term' || t.type === 'phrase')
                .map(t => t.value) || []
              }
            />
          </div>

          {/* Saved Searches Sidebar */}
          <div className="w-72 shrink-0 hidden xl:block">
            <SavedSearchesList
              savedSearches={savedSearches}
              recentSearches={recentSearches}
              onLoadSearch={loadSavedSearch}
              onSaveSearch={saveSearch}
              onDeleteSearch={deleteSavedSearch}
              onRunRecent={(q) => {
                setQuery(q);
                search();
              }}
              onClearHistory={clearHistory}
              currentQuery={query}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg lg:hidden"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Refine your search results
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <SearchFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
