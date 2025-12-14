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

// Check if document matches smart folder criteria
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
  console.log('organize-smart-folders function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    console.log('Processing document ID:', documentId);

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Get document details with insights
    const { data: document, error: docError } = await supabase
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
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Error fetching document:', docError);
      throw new Error('Document not found');
    }

    console.log('Found document:', document.filename);

    // Format document with insights
    const formattedDocument: Document = {
      ...document,
      insights: document.document_insights?.[0] || {}
    };

    // Get all smart folders for this user
    const { data: smartFolders, error: foldersError } = await supabase
      .from('smart_folders')
      .select('id, name, user_id, is_smart, ai_criteria')
      .eq('user_id', document.user_id)
      .eq('is_smart', true);

    if (foldersError) {
      console.error('Error fetching smart folders:', foldersError);
      throw new Error('Failed to fetch smart folders');
    }

    console.log(`Found ${smartFolders?.length || 0} smart folders`);

    const organizationResults = [];

    if (smartFolders && smartFolders.length > 0) {
      // Remove existing auto-assigned relationships for this document
      await supabase
        .from('document_folder_relationships')
        .delete()
        .eq('document_id', documentId)
        .eq('is_auto_assigned', true);

      for (const folder of smartFolders) {
        try {
          const matchResult = matchesCriteria(formattedDocument, folder.ai_criteria);
          
          console.log(`Folder "${folder.name}": matches=${matchResult.matches}, confidence=${matchResult.confidence.toFixed(2)}`);
          
          if (matchResult.matches) {
            // Insert relationship
            const { error: insertError } = await supabase
              .from('document_folder_relationships')
              .insert({
                document_id: documentId,
                folder_id: folder.id,
                confidence_score: matchResult.confidence,
                is_auto_assigned: true
              });

            if (insertError) {
              console.error(`Error inserting relationship for folder ${folder.name}:`, insertError);
            } else {
              // Update folder document count
              await supabase.rpc('increment', {
                table_name: 'smart_folders',
                row_id: folder.id,
                column_name: 'document_count'
              }).catch(console.error);

              organizationResults.push({
                folderId: folder.id,
                folderName: folder.name,
                confidence: matchResult.confidence,
                reasons: matchResult.reasons
              });

              console.log(`✓ Added document to folder: ${folder.name} (confidence: ${(matchResult.confidence * 100).toFixed(0)}%)`);
            }
          }
        } catch (error) {
          console.error(`Error processing folder ${folder.name}:`, error);
        }
      }
    }

    console.log(`Organization complete. Added to ${organizationResults.length} folders.`);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      organizationResults,
      message: `Document organized into ${organizationResults.length} smart folders`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in organize-smart-folders function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});