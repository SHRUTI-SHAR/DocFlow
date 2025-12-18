import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Image,
  Video,
  Music,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  BookOpen,
  Type,
  Mail,
  Palette,
  Box,
  Search,
  Grid3x3,
  List,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { FILE_CATEGORIES, getFileCategory, type FileCategory } from '@/components/file-preview/fileCategories';
import type { Document } from './types';
import { DocumentGrid } from '@/components/document-manager/DocumentGrid';
import { DocumentList } from '@/components/document-manager/DocumentList';

interface MediaBrowserProps {
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  onDocumentAction?: (action: string, doc: Document) => void;
}

interface CategoryInfo {
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  count: number;
  extensions: readonly string[];
}

const CATEGORY_CONFIG: Record<FileCategory, { icon: React.ElementType; color: string; bgColor: string }> = {
  image: { icon: Image, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
  video: { icon: Video, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900' },
  audio: { icon: Music, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900' },
  pdf: { icon: FileText, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900' },
  document: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  spreadsheet: { icon: FileSpreadsheet, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900' },
  presentation: { icon: Presentation, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900' },
  code: { icon: FileCode, color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900' },
  text: { icon: Type, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  archive: { icon: FileArchive, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
  ebook: { icon: BookOpen, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900' },
  font: { icon: Type, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  cad: { icon: Box, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900' },
  design: { icon: Palette, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900' },
  email: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  unknown: { icon: FileText, color: 'text-muted-foreground', bgColor: 'bg-muted' }
};

export function MediaBrowser({ documents, onDocumentSelect, onDocumentAction }: MediaBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Debug logging
  console.log('🎬 MediaBrowser: Received documents count:', documents.length);
  console.log('🎬 MediaBrowser: Sample document:', documents[0]);

  // Categorize documents and count
  const categorizedDocuments = useMemo(() => {
    const categoryMap = new Map<FileCategory, Document[]>();
    
    documents.forEach(doc => {
      const category = getFileCategory(doc.file_name, doc.file_type);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(doc);
    });

    return categoryMap;
  }, [documents]);

  // Build category list with counts
  const categories = useMemo(() => {
    const cats: CategoryInfo[] = [];
    
    Object.entries(FILE_CATEGORIES).forEach(([categoryKey, extensions]) => {
      const category = categoryKey as FileCategory;
      const count = categorizedDocuments.get(category)?.length || 0;
      
      if (count > 0) {
        const config = CATEGORY_CONFIG[category];
        cats.push({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          icon: config.icon,
          color: config.color,
          bgColor: config.bgColor,
          count,
          extensions
        });
      }
    });

    // Add unknown category if exists
    const unknownCount = categorizedDocuments.get('unknown')?.length || 0;
    if (unknownCount > 0) {
      cats.push({
        name: 'Other',
        icon: FileText,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        count: unknownCount,
        extensions: []
      });
    }

    // Sort by count descending
    return cats.sort((a, b) => b.count - a.count);
  }, [categorizedDocuments]);

  // Filter documents by selected category and search
  const filteredDocuments = useMemo(() => {
    let docs: Document[] = [];
    
    if (selectedCategory === 'all') {
      docs = documents;
    } else {
      docs = categorizedDocuments.get(selectedCategory) || [];
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      docs = docs.filter(doc => 
        doc.file_name.toLowerCase().includes(query)
      );
    }

    return docs;
  }, [documents, categorizedDocuments, selectedCategory, searchQuery]);

  const handleCategoryClick = (categoryKey: string) => {
    const category = categoryKey.toLowerCase() === 'other' ? 'unknown' : categoryKey.toLowerCase();
    setSelectedCategory(category as FileCategory);
  };

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <div>
            <p className="font-medium text-muted-foreground">No documents to browse</p>
            <p className="text-sm text-muted-foreground">Upload some files to organize by media type</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Category Sidebar */}
      <Card className="lg:w-72 shrink-0">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Media Categories</h3>
              <Badge variant="secondary">{documents.length} total</Badge>
            </div>

            {/* All Documents */}
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              className="w-full justify-start gap-2 h-auto py-2.5"
              onClick={() => setSelectedCategory('all')}
            >
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded">
                <Grid3x3 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">All Files</div>
              </div>
              <Badge variant="outline" className="ml-auto">
                {documents.length}
              </Badge>
            </Button>

            <div className="h-px bg-border my-2" />

            {/* Category List */}
            <ScrollArea className="max-h-[calc(100vh-300px)]">
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.name.toLowerCase() || 
                    (cat.name === 'Other' && selectedCategory === 'unknown');
                  
                  return (
                    <Button
                      key={cat.name}
                      variant={isSelected ? 'default' : 'ghost'}
                      className="w-full justify-start gap-2 h-auto py-2.5"
                      onClick={() => handleCategoryClick(cat.name)}
                    >
                      <div className={`p-1.5 rounded ${cat.bgColor}`}>
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{cat.name}</div>
                        {cat.extensions.length > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            {cat.extensions.slice(0, 3).join(', ')}
                            {cat.extensions.length > 3 && '...'}
                          </div>
                        )}
                      </div>
                      <Badge variant={isSelected ? 'secondary' : 'outline'} className="ml-auto">
                        {cat.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Document Display Area */}
      <div className="flex-1 space-y-4">
        {/* Header with Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'file' : 'files'}
            </Badge>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Display */}
        {filteredDocuments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="font-medium text-muted-foreground">
                {searchQuery ? 'No files match your search' : 'No files in this category'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Upload files to see them here'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <DocumentGrid
            documents={filteredDocuments}
            onSelect={onDocumentSelect}
            onDelete={(id) => onDocumentAction?.('delete', filteredDocuments.find(d => d.id === id)!)}
            onMove={(id, folderId) => onDocumentAction?.('move', filteredDocuments.find(d => d.id === id)!)}
            selectedIds={[]}
          />
        ) : (
          <DocumentList
            documents={filteredDocuments}
            onSelect={onDocumentSelect}
            onDelete={(id) => onDocumentAction?.('delete', filteredDocuments.find(d => d.id === id)!)}
            selectedIds={[]}
          />
        )}
      </div>
    </div>
  );
}
