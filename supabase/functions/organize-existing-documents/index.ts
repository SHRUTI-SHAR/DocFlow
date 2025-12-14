import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Supabase Configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SmartFolder {
  id: string;
  name: string;
  user_id: string;
  is_smart: boolean;
  ai_criteria: any;
}

interface Document {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  extracted_text: string;
  created_at: string;
  metadata: any;
  insights?: {
    importance_score?: number;
    key_topics?: string[];
    document_type?: string;
    categories?: string[];
  };
}

// Check if document matches smart folder criteria (same logic as organize-smart-folders)
function matchesCriteria(document: Document, criteria: any): { matches: boolean; confidence: number; reasons: string[] } {
  if (!criteria) return { matches: false, confidence: 0, reasons: [] };

  let totalScore = 0;
  let maxScore = 0;
  const reasons: string[] = [];

  // Content Type Matching
  if (criteria.content_type && Array.isArray(criteria.content_type)) {
    maxScore += 30;
    const contentTypes = criteria.content_type.map((t: string) => t.toLowerCase());
    const documentText = (document.extracted_text || '').toLowerCase();
    const fileName = (document.filename || '').toLowerCase();
    const documentType = (document.insights?.document_type || '').toLowerCase();
    
    let contentMatch = false;
    for (const type of contentTypes) {
      if (documentText.includes(type) || fileName.includes(type) || documentType.includes(type)) {
        contentMatch = true;
        reasons.push(`Content type match: ${type}`);
        break;
      }
    }
    
    if (contentMatch) {
      totalScore += 30;
    }
  }

  // Importance Score Matching
  if (criteria.importance_score && criteria.importance_score.min) {
    maxScore += 25;
    const docImportance = document.insights?.importance_score || 0;
    const minImportance = criteria.importance_score.min;
    
    if (docImportance >= minImportance) {
      totalScore += 25;
      reasons.push(`Importance score ${(docImportance * 100).toFixed(0)}% >= ${(minImportance * 100).toFixed(0)}%`);
    }
  }

  // Age/Recency Matching
  if (criteria.created_at && criteria.created_at.days) {
    maxScore += 20;
    const docDate = new Date(document.created_at);
    const daysAgo = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
    const maxDays = criteria.created_at.days;
    
    if (daysAgo <= maxDays) {
      totalScore += 20;
      reasons.push(`Created within last ${maxDays} days (${Math.round(daysAgo)} days ago)`);
    }
  }

  // Days Old Matching (alternative format)
  if (criteria.days_old && typeof criteria.days_old === 'number') {
    maxScore += 20;
    const docDate = new Date(document.created_at);
    const daysAgo = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysAgo <= criteria.days_old) {
      totalScore += 20;
      reasons.push(`Created within last ${criteria.days_old} days (${Math.round(daysAgo)} days ago)`);
    }
  }

  // Keywords Matching
  if (criteria.keywords && Array.isArray(criteria.keywords)) {
    maxScore += 25;
    const documentText = (document.extracted_text || '').toLowerCase();
    const fileName = (document.filename || '').toLowerCase();
    let keywordMatches = 0;
    
    for (const keyword of criteria.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (documentText.includes(keywordLower) || fileName.includes(keywordLower)) {
        keywordMatches++;
        reasons.push(`Keyword match: ${keyword}`);
      }
    }
    
    if (keywordMatches > 0) {
      const keywordScore = Math.min(25, (keywordMatches / criteria.keywords.length) * 25);
      totalScore += keywordScore;
    }
  }

  // Calculate confidence as percentage
  const confidence = maxScore > 0 ? (totalScore / maxScore) : 0;
  const matches = confidence >= 0.3; // Require at least 30% match

  return { matches, confidence, reasons };
}

serve(async (req) => {
  console.log('organize-existing-documents function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderId } = await req.json();
    console.log('Processing folder ID:', folderId);

    if (!folderId) {
      throw new Error('Folder ID is required');
    }

    // Get smart folder details
    const { data: folder, error: folderError } = await supabase
      .from('smart_folders')
      .select('id, name, user_id, is_smart, ai_criteria')
      .eq('id', folderId)
      .eq('is_smart', true)
      .single();

    if (folderError || !folder) {
      console.error('Error fetching smart folder:', folderError);
      throw new Error('Smart folder not found');
    }

    console.log('Processing smart folder:', folder.name);

    // Get all documents for this user that aren't already in this folder
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        user_id,
        filename,
        file_type,
        extracted_text,
        created_at,
        metadata,
        document_insights (
          importance_score,
          key_topics,
          document_type,
          categories
        )
      `)
      .eq('user_id', folder.user_id)
      .not('id', 'in', `(
        SELECT document_id FROM document_folder_relationships 
        WHERE folder_id = '${folderId}'
      )`);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      throw new Error('Failed to fetch documents');
    }

    console.log(`Found ${documents?.length || 0} documents to evaluate`);

    const organizationResults = [];
    let documentsAdded = 0;

    if (documents && documents.length > 0) {
      for (const document of documents) {
        try {
          // Format document with insights
          const formattedDocument: Document = {
            ...document,
            insights: document.document_insights?.[0] || {}
          };

          const matchResult = matchesCriteria(formattedDocument, folder.ai_criteria);
          
          console.log(`Document "${document.filename}": matches=${matchResult.matches}, confidence=${matchResult.confidence.toFixed(2)}`);
          
          if (matchResult.matches) {
            // Insert relationship
            const { error: insertError } = await supabase
              .from('document_folder_relationships')
              .insert({
                document_id: document.id,
                folder_id: folderId,
                confidence_score: matchResult.confidence,
                is_auto_assigned: true
              });

            if (insertError) {
              console.error(`Error inserting relationship for document ${document.filename}:`, insertError);
            } else {
              documentsAdded++;
              organizationResults.push({
                documentId: document.id,
                documentName: document.filename,
                confidence: matchResult.confidence,
                reasons: matchResult.reasons
              });

              console.log(`✓ Added document to folder: ${document.filename} (confidence: ${(matchResult.confidence * 100).toFixed(0)}%)`);
            }
          }
        } catch (error) {
          console.error(`Error processing document ${document.filename}:`, error);
        }
      }

      // Update folder document count
      if (documentsAdded > 0) {
        const { error: countError } = await supabase
          .from('smart_folders')
          .update({ document_count: documentsAdded })
          .eq('id', folderId);

        if (countError) {
          console.error('Error updating folder document count:', countError);
        }
      }
    }

    console.log(`Organization complete. Added ${documentsAdded} documents to folder "${folder.name}".`);

    return new Response(JSON.stringify({
      success: true,
      folderId,
      folderName: folder.name,
      documentsEvaluated: documents?.length || 0,
      documentsAdded,
      organizationResults,
      message: `${documentsAdded} existing documents organized into "${folder.name}"`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in organize-existing-documents function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});