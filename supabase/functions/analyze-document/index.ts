import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


// LiteLLM Configuration
const LITELLM_API_URL = Deno.env.get('LITELLM_API') || 'https://proxyllm.ximplify.id';
const LITELLM_API_KEY = Deno.env.get('LITELLM_VIRTUAL_KEY') || 'sk-k7D4-VDUe4kzCNWLTunPyw';

// Supabase Configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://nvdkgfptnqardtxlqoym.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52ZGtnZnB0bnFhcmR0eGxxb3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjEwMDMsImV4cCI6MjA2NzUzNzAwM30.1kZuW6_KAeF_5nmzwVxjFEkOCML9-IpG59CDEaOvXd4';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper: detect data URLs
function isDataUrl(url: string) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/.test(url);
}

// Helper: base64 -> Uint8Array
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// Ensure bucket exists (idempotent)
async function ensureBucket(bucket: string) {
  try {
    const { error } = await supabase.storage.createBucket(bucket, { public: false });
    if (error && !String(error.message || '').toLowerCase().includes('already exists')) {
      console.warn('[Storage] createBucket error (ignored if exists):', error.message);
    }
  } catch (e) {
    console.warn('[Storage] createBucket threw, continuing:', e);
  }
}

// Upload data URL to storage and return a signed URL (1 hour)
async function dataUrlToSignedUrl(dataUrl: string, suggestedName?: string) {
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.*)$/);
  if (!match) throw new Error('Unsupported image data URL');
  const contentType = match[1];
  const ext = contentType.split('/')[1] === 'jpeg' ? 'jpg' : contentType.split('/')[1];
  const base64 = match[3];
  const bytes = base64ToUint8Array(base64);

  const bucket = 'ai-inputs';
  await ensureBucket(bucket);

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const fileName = `${crypto.randomUUID()}-${(suggestedName || 'doc').replace(/[^a-zA-Z0-9_-]+/g, '-')}.${ext}`;
  const path = `${y}/${m}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (uploadError) {
    console.error('[Storage] upload error:', uploadError);
    throw new Error('Failed to upload image for analysis');
  }

  const { data: signed, error: signError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (signError || !signed?.signedUrl) {
    console.error('[Storage] signed URL error:', signError);
    throw new Error('Failed to create image URL for analysis');
  }

  return signed.signedUrl;
}

// Save extracted data to database
async function saveDocumentData(documentData: any, ocrResult: any, fieldResult: any, templateResult: any, userId?: string) {
  try {
    console.log('Saving document data to database...');
    
    // Save to documents table
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: userId || null,
        file_name: documentData.filename || 'unknown',
        storage_path: documentData.filePath || '',
        file_size: documentData.fileSize || 0,
        file_type: documentData.fileType || 'application/octet-stream',
        original_url: documentData.storageUrl || '',
        extracted_text: ocrResult?.extractedText || '',
        confidence_score: ocrResult?.confidence || 0.5,
        processing_status: 'completed',
        metadata: {
          ocr_confidence: ocrResult?.confidence || 0.5,
          language: ocrResult?.language || 'en',
          template_matches: templateResult?.matches || [],
          processing_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (docError) {
      console.error('Error saving document:', docError);
      return null;
    }

    console.log('Document saved with ID:', document.id);

    // Save field data to document_fields table
    if (fieldResult?.fields && fieldResult.fields.length > 0) {
      const fieldInserts = fieldResult.fields.map((field: any) => ({
        document_id: document.id,
        field_name: field.label || field.id,
        field_type: field.type || 'text',
        field_value: field.value || '',
        confidence: field.confidence || 0.5,
        position: field.position || null
      }));

      const { error: fieldsError } = await supabase
        .from('document_fields')
        .insert(fieldInserts);

      if (fieldsError) {
        console.error('Error saving document fields:', fieldsError);
      } else {
        console.log(`Saved ${fieldInserts.length} document fields`);
      }
    }

    return document;
  } catch (error) {
    console.error('Error in saveDocumentData:', error);
    return null;
  }
}


serve(async (req) => {
  console.log('=== UPDATED EDGE FUNCTION CALLED ===');
  console.log('analyze-document function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentData, task, documentName, userId, saveToDatabase = false } = await req.json();
    console.log('Received request with task:', task, 'documentName:', documentName);
    console.log('Save to database:', saveToDatabase);
    console.log('User ID:', userId);

    // Resolve image reference: prefer inline data URLs; else accept http(s)
    let resolvedImageUrl: string | undefined = undefined;
    try {
      if (typeof documentData === 'string' && isDataUrl(documentData)) {
        console.log('[Image] Data URL detected, using inline base64');
        resolvedImageUrl = documentData;
      } else if (typeof documentData === 'string' && /^https?:\/\//.test(documentData)) {
        resolvedImageUrl = documentData;
      }
    } catch (imgErr) {
      console.error('[Image] Failed to prepare image reference:', imgErr);
      throw imgErr;
    }

    let prompt = '';
    let responseFormat = {};

    switch (task) {
      case 'ocr':
        prompt = `Analyze this document image and extract all text content. Return the extracted text in a structured JSON format with fields: "extractedText", "confidence", "language".`;
        responseFormat = {
          type: "json_object"
        };
        break;
      
      case 'field_detection':
        prompt = `COMPREHENSIVE FIELD EXTRACTION: Analyze this document and extract ALL possible data fields with maximum completeness.

CRITICAL INSTRUCTIONS:
- Extract EVERY data field, label, value, and piece of information from the document
- Do NOT limit yourself to obvious form fields - include ALL text, numbers, dates, names, addresses, codes, etc.
- Look for fields in headers, footers, tables, lists, and all document sections
- Include both labeled fields and unlabeled data points
- Extract ALL visible text content as individual fields when appropriate

For each field you detect:
1. Extract the field value accurately
2. Assign a confidence score based on:
   - Text clarity and readability (0.8-1.0 for clear text, 0.6-0.8 for moderate clarity, 0.4-0.6 for poor clarity)
   - Field type certainty (0.9-1.0 for obvious types like dates/numbers, 0.7-0.9 for text fields)
   - Value completeness (0.9-1.0 for complete values, 0.6-0.8 for partial values)

FIELD TYPES TO EXTRACT:
- Personal Information (names, addresses, phone numbers, emails)
- Dates (registration dates, expiry dates, birth dates, etc.)
- Numbers (registration numbers, IDs, amounts, quantities)
- Codes (vehicle codes, license codes, reference numbers)
- Status fields (active, expired, pending, etc.)
- Descriptions (vehicle models, types, categories)
- ANY other data visible in the document

Return a JSON object with a "fields" array containing objects with properties: "id", "label", "type" (text/number/date/email/phone), "value", "confidence" (decimal 0.0-1.0), "position" (x, y coordinates), "suggested" (boolean).

IMPORTANT: Extract as many fields as possible. A typical vehicle registration document should have 20-30+ fields. Do not stop at obvious fields - be thorough and comprehensive.

Example response format:
{
  "fields": [
    {
      "id": "1",
      "label": "Registration Number",
      "type": "text",
      "value": "HR51BR5510",
      "confidence": 0.95,
      "position": {"x": 100, "y": 200},
      "suggested": true
    }
  ]
}`;
        responseFormat = {
          type: "json_object"
        };
        break;
      
      case 'template_matching': {
        // First, extract fields from the document to get total field count
        console.log('[TemplateMatching] Starting field extraction to get total field count...');
        
        // Get actual templates from database with fallback
        let templateList = 'No templates found';
        let templatesCount = 0;
        
        try {
          const { data: templates, error: templatesError } = await supabase
            .from('document_templates')
            .select('id, name, description, fields, document_type, version')
            .eq('status', 'active');
          
          if (templatesError) {
            console.error('Error fetching templates from database:', templatesError);
            throw new Error(`Failed to fetch templates: ${templatesError.message}`);
          } else {
            // Pass complete template data to LLM for proper field matching
            const templateData = templates?.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              document_type: t.document_type,
              version: t.version,
              fields: t.fields || []
            })) || [];
            
            templateList = JSON.stringify(templateData);
            templatesCount = templates?.length || 0;
            console.log(`[Info] Successfully fetched ${templatesCount} templates with field data from database`);
            console.log(`[Info] Template data:`, templateData);
          }
        } catch (error) {
          console.error('Database connection error:', error);
          throw new Error(`Database connection failed: ${error.message}`);
        }
        
        console.log(`[Info] Available templates: ${templateList}`);
        console.log(`[Info] Total templates found: ${templatesCount}`);
        
        prompt = `You are an expert in document understanding and template matching.

Return STRICT JSON only. Perform these steps:
1) Detect one best documentType.
2) Extract all fields (label, value, optional type, optional confidence, optional position).
3) From the available templates (JSON below), consider ONLY those with the same documentType and compare fields.

Available templates (JSON): ${templateList}

Matching requirements (be strict and exhaustive):
- Treat each template's field list as a checklist and attempt to map EVERY field.
- Use robust normalization when comparing names: lowercase, trim, remove punctuation/extra spaces/underscores, singular/plural, common OCR variants.
- Consider synonyms and abbreviations when a value clearly corresponds (e.g., "Pollution Under Control" ≈ "PUC", "valid upto" ≈ "valid until", "policy no" ≈ "policy number").
- If a document contains the information but with a slightly different label, still count it as matched.
- Only leave a field in unmatchedTemplateFields if it is truly absent after thorough search.

Explicit synonym hints (map these to template field names when applicable):
- puc_certificate_number ⇔ "PUC Certificate No", "PUC No", "Pollution Certificate Number", "Emission Certificate No"
- puc_valid_upto ⇔ "PUC Valid Upto", "PUC Valid Till", "PUC Expiry", "PUC Expiry Date", "Pollution Certificate Valid Until", "Emission Valid Till"
- policy_number ⇔ "Policy No", "Policy #"

Date handling:
- Parse dates in formats like DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD Mon YYYY, Mon YYYY, and map to the appropriate field if context matches.

Return JSON with:
- detectedDocumentType: string
- totalExtractedFields: number
- matches: array (empty if no suitable template)

Each match must be:
{
  id: string,
  name: string,
  version: string,
  documentType: string,
  totalFields: number,                 // exact number of fields in template
  matchedFields: string[],             // template field names found in the document
  unmatchedTemplateFields: string[],   // template field names NOT found in the document
  confidence: number                   // 0..1, matchedFields.length/totalFields
}

Rules:
- Do not include templates with a different documentType.
- Confidence MUST equal matchedFields.length / totalFields (no extra bonuses).
- Do not omit unmatchedTemplateFields; list all remaining template field names not in matchedFields.`;
        responseFormat = {
          type: "json_object"
        };
        break;
      }
      
      default:
        prompt = `Analyze this document and provide comprehensive information including text extraction, field detection, and template matching.`;
    }

    console.log('Making request to LiteLLM proxy at:', LITELLM_API_URL);
    console.log('API Key available:', LITELLM_API_KEY ? 'Yes' : 'No');
    console.log('Document data available:', documentData ? 'Yes' : 'No');
    
    // Use Azure GPT-4.1 model
    const selectedModel = 'azure/gpt-4.1';
    console.log('Using Azure model:', selectedModel);

    const requestBody = {
      model: selectedModel, // Using selected model for better compatibility
        messages: [
          {
            role: 'system',
            content: `You are an advanced document analysis expert specializing in OCR, form field detection, and template matching for ANY type of document.

For OCR tasks:
- Extract ALL visible text from the document image regardless of document type
- Maintain original formatting and structure
- Include headers, labels, values, and any other text
- Provide confidence scores based on text clarity

For field detection:
- Identify ALL form fields, labels, and data points in the document
- Categorize fields by type (text, number, date, email, etc.)
- Provide position coordinates when possible
- Assess confidence based on field clarity
- Extract data from ANY document type (invoices, contracts, forms, certificates, receipts, etc.)

For template matching:
- Match document structure to known templates
- Provide confidence scores for matches
- Identify document type and category
- Work with ANY document type

Always respond with valid JSON in the exact format requested.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${prompt}\n\nDocument name: ${documentName ?? 'unknown'}\n\nPlease analyze this document thoroughly and extract ALL relevant information regardless of document type.`
              },
              ...(resolvedImageUrl ? [{
                type: 'image_url',
                image_url: {
                  url: resolvedImageUrl,
                  detail: 'high' // Use high detail for better OCR accuracy
                }
              }] : [])
            ]
          }
        ],
        response_format: responseFormat,
        temperature: 0.1,
      max_tokens: 4000 // Increased for more detailed responses
    };

    console.log('=== MAKING REAL API CALL ===');
    console.log('Request body prepared, making API call...');
    console.log('Document data length:', documentData ? documentData.length : 'No document data');
    console.log('Task:', task);
    console.log('Document name:', documentName);

    const response = await fetch(`${LITELLM_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LITELLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('LiteLLM API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LiteLLM API error:', response.status, errorText);
      throw new Error(`LiteLLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('LiteLLM response received, processing...');
    console.log('Usage:', data.usage);

    if (!data.choices || !data.choices[0]) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from LiteLLM API');
    }

    const content = data.choices[0].message.content;
    console.log('[Info] Response received, length:', content ? content.length : 0, 'characters');

    let result;
    try {
      result = JSON.parse(content);
      console.log('[Info] Successfully parsed JSON response');
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('Failed to parse JSON response from AI');
    }

    // Basic logging without sensitive data
    console.log(`[Info] ${task.toUpperCase()} analysis completed successfully`);
    console.log(`[Info] Document: ${documentName || 'unknown'}`);
    
    if (task === 'ocr' && result.extractedText) {
      console.log(`[Info] OCR: ${result.extractedText.length} characters extracted, confidence: ${result.confidence || 'N/A'}`);
    }
    
    if (task === 'field_detection' && result.fields) {
      console.log(`[Info] Field Detection: ${result.fields.length} fields detected`);
      console.log(`[Info] Field names:`, result.fields.map((f: any) => f.label || f.name).slice(0, 10).join(', '), result.fields.length > 10 ? '...' : '');
    }
    
    if (task === 'template_matching') {
      // Skip verbose JSON logging for template matching results

      // Normalize counts using DB truth and matchedFields length
      let dbTplFields: Map<string, string[]> = new Map();
      try {
        // Re-fetch active templates quickly to build a map for id -> fieldsLength
        const { data: normTemplates } = await supabase
          .from('document_templates')
          .select('id, fields')
          .eq('status', 'active');

        const tplFieldCount = new Map<string, number>();
        (normTemplates || []).forEach((t: any) => {
          const len = Array.isArray(t?.fields) ? t.fields.length : 0;
          if (t?.id) tplFieldCount.set(t.id, len);
          if (t?.id) dbTplFields.set(t.id, Array.isArray(t.fields) ? t.fields : []);
        });

        if (result && Array.isArray(result.matches)) {
          result.matches = result.matches.map((m: any) => {
            const dbTotal = tplFieldCount.get(m.id) ?? m.totalFields ?? 0;
            const matchedCount = Array.isArray(m.matchedFields) ? m.matchedFields.length : 0;
            const extracted = Number(result.totalExtractedFields || 0);
            // Force total fields from DB
            m.totalFields = dbTotal;
            // Ensure denominator is not smaller than matched
            const normalizedExtracted = Math.max(extracted, matchedCount);
            result.totalExtractedFields = normalizedExtracted;
            // Optional: recompute confidence using normalized denominator
            if (normalizedExtracted > 0 && matchedCount >= 0) {
              m.confidence = Math.min(1, matchedCount / normalizedExtracted);
            }
            console.log(`[TM] NORMALIZED -> id=${m.id} totalFields(DB)=${m.totalFields} matched=${matchedCount} totalExtracted=${result.totalExtractedFields} confidence=${m.confidence}`);
            return m;
          });
        }
      } catch (normErr) {
        console.log('[TM] Normalization step failed:', normErr);
      }

      if (result?.matches) {
        // LLM-only mode: trust LLM output as-is
        result.matches.forEach((m: any, i: number) => {
          const llmCount = Array.isArray(m.matchedFields) ? m.matchedFields.length : Number(m.matchedFields || 0) || 0;
          console.log(`[TM] #${i + 1} LLM-ONLY id=${m.id} name="${m.name}"`);
          console.log(`[TM]    LLM matchedFields.count=${llmCount} totalFields(LLM)=${m.totalFields}`);
          // Map common LLM keys to frontend-expected names (no computation)
          if (!Array.isArray(m.matchedFields) && Array.isArray(m.matchedTemplateFields)) {
            m.matchedFields = m.matchedTemplateFields;
          }
          if (!Array.isArray(m.unmatchedFieldNames) && Array.isArray(m.unmatchedTemplateFields)) {
            m.unmatchedFieldNames = m.unmatchedTemplateFields;
          }
          if (!Array.isArray(m.unmatchedFieldNames) && Array.isArray(m.unmatched_fields)) {
            m.unmatchedFieldNames = m.unmatched_fields;
          }
          const unmatchedLen = Array.isArray(m.unmatchedFieldNames) ? m.unmatchedFieldNames.length : 0;
          const logSample = Array.isArray(m.unmatchedFieldNames) ? m.unmatchedFieldNames.slice(0, 5).join(', ') : 'N/A';
          console.log(`[TM]    LLM unmatchedFieldNames.count=${unmatchedLen} sample=[${logSample}]`);
        });
      } else {
        console.log('[TM] No matches returned by LLM or result structure missing');
      }
    }

    // Save to database if requested
    let savedDocument = null;
    if (saveToDatabase && documentData) {
      console.log('Saving extracted data to database...');
      savedDocument = await saveDocumentData(
        documentData, 
        task === 'ocr' ? result : null,
        task === 'field_detection' ? result : null,
        task === 'template_matching' ? result : null,
        userId
      );
      
      if (savedDocument) {
        console.log('Document data saved successfully with ID:', savedDocument.id);
      } else {
        console.log('Failed to save document data to database');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      task,
      result,
      usage: data.usage,
      savedDocument: savedDocument ? { id: savedDocument.id } : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-document function:', error);
    
    // Return a structured error response instead of throwing
    const errorResponse = {
      success: false,
      error: error.message || 'Unknown error occurred',
      task: task || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    console.error('Returning error response:', errorResponse);
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});