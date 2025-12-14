export interface TemplateField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'checkbox' | 'select' | 'submit' | 'cancel' | 'textarea' | 'image' | 'signature' | 'table' | 'radio' | 'file';
  label: string;
  required: boolean;
  confidence?: number;
  value?: string;
  suggested?: boolean;
  section?: string; // For hierarchical organization
  columns?: string[]; // For table fields
  options?: string[]; // For select and radio type fields
  isGroupedTable?: boolean; // For tables with nested objects requiring grouped headers
  groupedHeaders?: Array<{ name: string; colspan: number; subHeaders: string[] }>; // Grouped header structure for nested tables
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface TemplateCreateData {
  name: string;
  description?: string;
  document_type: string;
  fields: TemplateField[];
  version?: string;
  status?: 'draft' | 'active' | 'archived';
  is_public?: boolean;
  metadata?: any;
}