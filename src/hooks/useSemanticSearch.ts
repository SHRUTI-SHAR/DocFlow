import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SemanticSearchResult {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  extracted_text?: string;
  created_at: string;
  updated_at: string;
  document_type?: string;
  file_size?: number;
  processing_status?: string;
  similarity: number;
  relevanceScore: number;
}

export const useSemanticSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const { toast } = useToast();

  const searchDocuments = async (
    query: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<SemanticSearchResult[]> => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    try {
      setIsSearching(true);
      setLastQuery(query);

      const { data: user } = await supabase.auth.getUser();
      
      const fastApiUrl = (import.meta as any).env.VITE_FASTAPI_URL;
      if (!fastApiUrl) throw new Error('VITE_FASTAPI_URL is required');
      const resp = await fetch(`${fastApiUrl}/api/v1/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          limit,
          threshold,
          userId: user.user?.id
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        console.error('Semantic search error:', err);
        throw new Error(err?.detail || `Search failed: HTTP ${resp.status}`);
      }

      const payload = await resp.json();
      const searchResults = payload?.results || [];
      setResults(searchResults);

      if (searchResults.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or using different keywords.",
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${searchResults.length} relevant documents.`,
        });
      }

      return searchResults;
    } catch (error) {
      console.error('Error in semantic search:', error);
      
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });

      setResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setLastQuery("");
  };

  return {
    isSearching,
    results,
    lastQuery,
    searchDocuments,
    clearResults
  };
};