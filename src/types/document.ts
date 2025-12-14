export interface DocumentData {
  id: string;
  name: string;
  type: string;
  size: number;
  base64Data: string;
  uploadedAt: Date;
}

export interface AnalysisResult {
  extractedText?: string;
  confidence?: number;
  language?: string;
  fields?: DetectedField[];
  matches?: TemplateMatch[];
  totalExtractedFields?: number; // Total number of fields extracted from the document
}

export interface DetectedField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'email' | 'phone';
  value: string;
  confidence: number;
  position: { x: number; y: number };
  suggested: boolean;
}

export interface TemplateMatch {
  id: string;
  name: string;
  confidence: number;
  version: string;
  documentType: string;
  matchedFields: number;
  totalFields: number;
  totalExtractedFields?: number; // Total number of fields extracted from the document
  matchedFieldNames?: string[]; // Array of field names that matched the template
}

export interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  duration?: number;
}

export type AnalysisTask = 'field_detection' | 'template_matching' | 'template_guided_extraction';