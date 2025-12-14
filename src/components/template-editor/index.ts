/**
 * Template Editor Module
 * 
 * Centralized exports for template editor functionality
 * Note: TemplateEditor is exported from the parent components folder
 */

// Export hooks and utilities
export { useTemplateFields } from './hooks/useTemplateFields';
export { useTemplateSections } from './hooks/useTemplateSections';
export { useTemplateSave } from './hooks/useTemplateSave';
export { useTemplateExtraction } from './hooks/useTemplateExtraction';
export * from './utils/templateHelpers';
export * from './utils/templateDataConverters';

// Export components
export * from './components';

