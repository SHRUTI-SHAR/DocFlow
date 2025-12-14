import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bookmark, Plus, MoreVertical, Trash2, Play,
  Clock, Search, Star
} from 'lucide-react';
import { SavedSearch, RecentSearch } from '@/types/search';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SavedSearchesListProps {
  savedSearches: SavedSearch[];
  recentSearches: RecentSearch[];
  onLoadSearch: (search: SavedSearch) => void;
  onSaveSearch: (name: string) => Promise<SavedSearch | null>;
  onDeleteSearch: (id: string) => Promise<boolean>;
  onRunRecent: (query: string) => void;
  onClearHistory: () => void;
  currentQuery?: string;
  className?: string;
}

export const SavedSearchesList: React.FC<SavedSearchesListProps> = ({
  savedSearches,
  recentSearches,
  onLoadSearch,
  onSaveSearch,
  onDeleteSearch,
  onRunRecent,
  onClearHistory,
  currentQuery = '',
  className
}) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newSearchName.trim()) return;
    
    setIsSaving(true);
    const result = await onSaveSearch(newSearchName.trim());
    
    if (result) {
      setSaveDialogOpen(false);
      setNewSearchName('');
    }
    
    setIsSaving(false);
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Searches
          </CardTitle>
          
          {currentQuery && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1">
                  <Plus className="h-3 w-3" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Search</DialogTitle>
                  <DialogDescription>
                    Save this search to quickly run it again later
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Input
                      value={newSearchName}
                      onChange={(e) => setNewSearchName(e.target.value)}
                      placeholder="Search name"
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">Query:</p>
                      <p className="text-sm font-mono truncate">{currentQuery}</p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !newSearchName.trim()}>
                    {isSaving ? 'Saving...' : 'Save Search'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {/* Saved searches */}
          {savedSearches.length > 0 ? (
            <div className="px-4 pb-4 space-y-2">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors group"
                >
                  <Star className="h-4 w-4 text-amber-500 shrink-0" />
                  
                  <button
                    onClick={() => onLoadSearch(search)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium truncate">{search.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">
                      {search.query}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onLoadSearch(search)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onLoadSearch(search)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run Search
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteSearch(search.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No saved searches</p>
              <p className="text-xs">Save a search to access it quickly</p>
            </div>
          )}

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <>
              <div className="px-4 py-2 flex items-center justify-between border-t">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onClearHistory}
                >
                  Clear
                </Button>
              </div>
              
              <div className="px-4 pb-4 space-y-1">
                {recentSearches.slice(0, 10).map((recent) => (
                  <button
                    key={recent.id}
                    onClick={() => onRunRecent(recent.query)}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm truncate">{recent.query}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {recent.resultCount}
                    </Badge>
                  </button>
                ))}
              </div>
            </>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
