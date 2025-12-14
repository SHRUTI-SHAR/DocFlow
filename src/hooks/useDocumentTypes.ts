import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DocumentType {
  id: string;
  name: string;
  display_name: string;
  icon: string;
  color: string;
  bucket_name: string;
  document_count?: number;
  created_at?: string;
}

interface UseDocumentTypesResult {
  types: DocumentType[];
  loading: boolean;
  error: string | null;
  refreshTypes: () => Promise<void>;
}

export const useDocumentTypes = (): UseDocumentTypesResult => {
  const [types, setTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocumentTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get types from FastAPI backend
      const fastApiUrl = (import.meta as any).env?.VITE_FASTAPI_URL;
      if (!fastApiUrl) throw new Error('VITE_FASTAPI_URL is required');
      
      try {
        const response = await fetch(`${fastApiUrl}/api/v1/document-types`);
        if (response.ok) {
          const data = await response.json();
          if (data.types && Array.isArray(data.types)) {
            // Add document counts from local documents
            const typesWithCounts = await addDocumentCounts(data.types);
            setTypes(typesWithCounts);
            return;
          }
        }
      } catch (apiError) {
        console.warn('Could not fetch from FastAPI, falling back to Supabase:', apiError);
      }

      // Fallback: Get unique document types from documents table
      const { data: documentsData, error: docsError } = await supabase
        .from('documents')
        .select('document_type')
        .not('document_type', 'is', null);

      if (docsError) {
        // Column might not exist yet
        if (docsError.code === '42703') {
          setTypes([]);
          return;
        }
        throw docsError;
      }

      // Count documents per type
      const typeCounts: Record<string, number> = {};
      documentsData?.forEach((doc: { document_type: string | null }) => {
        if (doc.document_type) {
          typeCounts[doc.document_type] = (typeCounts[doc.document_type] || 0) + 1;
        }
      });

      // Create type objects from unique types
      const uniqueTypes: DocumentType[] = Object.entries(typeCounts).map(([typeName, count]) => ({
        id: typeName,
        name: typeName,
        display_name: typeName.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        icon: getIconForType(typeName),
        color: getColorForType(typeName),
        bucket_name: `${typeName}-documents`,
        document_count: count
      }));

      setTypes(uniqueTypes);
    } catch (err) {
      console.error('Error fetching document types:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch document types');
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  return {
    types,
    loading,
    error,
    refreshTypes: fetchDocumentTypes
  };
};

// Helper function to add document counts to types
async function addDocumentCounts(types: DocumentType[]): Promise<DocumentType[]> {
  try {
    const { data: countData } = await supabase
      .from('documents')
      .select('document_type')
      .not('document_type', 'is', null);

    const typeCounts: Record<string, number> = {};
    countData?.forEach((doc: { document_type: string | null }) => {
      if (doc.document_type) {
        typeCounts[doc.document_type] = (typeCounts[doc.document_type] || 0) + 1;
      }
    });

    return types.map(type => ({
      ...type,
      document_count: typeCounts[type.name] || 0
    }));
  } catch {
    return types;
  }
}

// Get appropriate icon for document type
function getIconForType(typeName: string): string {
  const iconMap: Record<string, string> = {
    'pan-card': 'CreditCard',
    'aadhaar-card': 'CreditCard',
    'passport': 'FileCheck',
    'driving-license': 'CreditCard',
    'bank-statement': 'FileSpreadsheet',
    'invoice': 'Receipt',
    'salary-slip': 'FileText',
    'form-16': 'FileCheck',
    'voter-id': 'CreditCard',
    'birth-certificate': 'FileCheck',
    'electricity-bill': 'Receipt',
    'rental-agreement': 'FileText',
    'insurance-policy': 'FileCheck',
    'marksheet': 'FileSpreadsheet'
  };
  return iconMap[typeName] || 'FileText';
}

// Get appropriate color for document type
function getColorForType(typeName: string): string {
  const colorMap: Record<string, string> = {
    'pan-card': '#f59e0b',
    'aadhaar-card': '#10b981',
    'passport': '#3b82f6',
    'driving-license': '#8b5cf6',
    'bank-statement': '#06b6d4',
    'invoice': '#ec4899',
    'salary-slip': '#14b8a6',
    'form-16': '#f97316',
    'voter-id': '#84cc16',
    'birth-certificate': '#a855f7',
    'electricity-bill': '#eab308',
    'rental-agreement': '#22c55e',
    'insurance-policy': '#0ea5e9',
    'marksheet': '#6366f1'
  };
  return colorMap[typeName] || '#64748b';
}
