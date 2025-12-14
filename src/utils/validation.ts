import { z } from 'zod';
import { FIELD_TYPES } from '@/constants/app';

/**
 * Validation utilities and schemas
 */

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number');
export const urlSchema = z.string().url('Please enter a valid URL');

/**
 * File validation schemas
 */
export const fileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().positive('File size must be positive'),
  type: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only PDF and image files are supported' })
  })
});

/**
 * Document validation schemas
 */
export const documentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  file_path: z.string().min(1, 'File path is required'),
  file_size: z.number().positive('File size must be positive'),
  mime_type: z.string().min(1, 'MIME type is required'),
  folder_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  user_id: z.string().uuid()
});

/**
 * Template validation schemas
 */
export const templateFieldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Field name is required'),
  type: z.nativeEnum(FIELD_TYPES),
  required: z.boolean().default(false),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
});

export const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Template name is required').max(255, 'Template name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  fields: z.array(templateFieldSchema),
  sample_image_url: z.string().url().optional(),
  usage_count: z.number().min(0).default(0),
  created_by: z.string().uuid(),
  is_public: z.boolean().default(false)
});

/**
 * Form validation schemas
 */
export const formFieldSchema = z.object({
  id: z.string().min(1),
  type: z.nativeEnum(FIELD_TYPES),
  label: z.string().min(1, 'Field label is required'),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validation: z.object({
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
});

export const formSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Form title is required').max(255, 'Form title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  schema: z.object({
    fields: z.array(formFieldSchema)
  }),
  is_public: z.boolean().default(false),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  user_id: z.string().uuid()
});

/**
 * User profile validation schemas
 */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name too long'),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500, 'Bio too long').optional()
});

/**
 * Validation utility functions
 */

/**
 * Validates a file against our requirements
 */
export const validateFile = (file: File): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Type validation
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only PDF and image files are supported');
  }

  // Name validation
  if (!file.name || file.name.length === 0) {
    errors.push('File must have a name');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates email format
 */
export const isValidEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

/**
 * Validates URL format
 */
export const isValidUrl = (url: string): boolean => {
  return urlSchema.safeParse(url).success;
};

/**
 * Validates phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  return phoneSchema.safeParse(phone).success;
};

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates and sanitizes form data
 */
export const validateFormData = (data: Record<string, any>, schema: z.ZodSchema): {
  isValid: boolean;
  data?: any;
  errors?: z.ZodError;
} => {
  try {
    // Sanitize string inputs
    const sanitizedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = sanitizeInput(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    const validatedData = schema.parse(sanitizedData);
    return { isValid: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error };
    }
    throw error;
  }
};

/**
 * Creates validation error messages from Zod errors
 */
export const formatValidationErrors = (errors: z.ZodError): Record<string, string> => {
  return errors.errors.reduce((acc, error) => {
    const path = error.path.join('.');
    acc[path] = error.message;
    return acc;
  }, {} as Record<string, string>);
};