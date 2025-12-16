import { useState, useEffect, useMemo } from 'react';
import type { Document, SortOrder } from '../types';

interface UseDocumentFilteringOptions {
  documents: Document[];
  searchQuery: string;
  selectedFolder: string;
  selectedTag: string;
  sortBy: string;
  sortOrder: SortOrder;
}

export function useDocumentFiltering({
  documents,
  searchQuery,
  selectedFolder,
  selectedTag,
  sortBy,
  sortOrder,
}: UseDocumentFilteringOptions) {
  const filteredDocuments = useMemo(() => {
    console.log('🔍 useDocumentFiltering: Input documents:', documents.length, 'selectedFolder:', selectedFolder);
    
    let filtered = documents.filter(doc => {
      const matchesSearch = searchQuery === '' || 
        doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.extracted_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.insights?.summary?.toLowerCase().includes(searchQuery.toLowerCase());

      // Special handling for recycle-bin folder - don't filter, show all deleted documents
      const matchesFolder = selectedFolder === 'all' || 
        selectedFolder === 'recycle-bin' ||
        doc.folders?.some(folder => folder.id === selectedFolder);

      const matchesTag = selectedTag === 'all' || 
        doc.tags?.some(tag => tag.id === selectedTag);

      return matchesSearch && matchesFolder && matchesTag;
    });

    // Sort documents
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.file_name.toLowerCase();
          bValue = b.file_name.toLowerCase();
          break;
        case 'size':
          aValue = a.file_size;
          bValue = b.file_size;
          break;
        case 'importance':
          aValue = a.insights?.importance_score || 0;
          bValue = b.insights?.importance_score || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    console.log('🔍 useDocumentFiltering: Filtered documents:', filtered.length);
    return filtered;
  }, [documents, searchQuery, selectedFolder, selectedTag, sortBy, sortOrder]);

  return { filteredDocuments };
}
