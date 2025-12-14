import { toast } from '@/hooks/use-toast';
import { ERROR_MESSAGES } from '@/constants/app';

/**
 * Centralized error handling utilities
 */

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError extends Error {
  type: ErrorType;
  code?: string;
  statusCode?: number;
  context?: Record<string, any>;
  cause?: Error;
}

/**
 * Creates a standardized application error
 */
export const createAppError = (
  type: ErrorType,
  message: string,
  options?: {
    code?: string;
    statusCode?: number;
    context?: Record<string, any>;
    cause?: Error;
  }
): AppError => {
  const error = new Error(message) as AppError;
  error.type = type;
  error.code = options?.code;
  error.statusCode = options?.statusCode;
  error.context = options?.context;
  
  if (options?.cause) {
    error.cause = options.cause;
  }

  return error;
};

/**
 * Handles Supabase specific errors
 */
export const handleSupabaseError = (error: any): AppError => {
  // Row Level Security violations
  if (error.code === '42501' || error.message?.includes('row-level security')) {
    return createAppError('PERMISSION_ERROR', 'You don\'t have permission to perform this action', {
      code: error.code,
      context: { originalError: error }
    });
  }

  // Not found errors
  if (error.code === 'PGRST116') {
    return createAppError('NOT_FOUND_ERROR', 'The requested resource was not found', {
      code: error.code,
      context: { originalError: error }
    });
  }

  // Unique constraint violations
  if (error.code === '23505') {
    return createAppError('VALIDATION_ERROR', 'This item already exists', {
      code: error.code,
      context: { originalError: error }
    });
  }

  // Foreign key constraint violations
  if (error.code === '23503') {
    return createAppError('VALIDATION_ERROR', 'Referenced item does not exist', {
      code: error.code,
      context: { originalError: error }
    });
  }

  // Authentication errors
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return createAppError('AUTH_ERROR', 'Authentication required. Please sign in again.', {
      code: error.code,
      context: { originalError: error }
    });
  }

  // Network errors
  if (!navigator.onLine) {
    return createAppError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK_ERROR, {
      context: { originalError: error }
    });
  }

  // Default to server error
  return createAppError('SERVER_ERROR', error.message || ERROR_MESSAGES.UNKNOWN_ERROR, {
    code: error.code,
    statusCode: error.status || error.statusCode,
    context: { originalError: error }
  });
};

/**
 * Handles file upload specific errors
 */
export const handleFileError = (error: any, file?: File): AppError => {
  if (file && !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return createAppError('VALIDATION_ERROR', ERROR_MESSAGES.INVALID_FILE_TYPE, {
      context: { fileType: file.type, fileName: file.name }
    });
  }

  return handleSupabaseError(error);
};

/**
 * Generic error handler with toast notification
 */
export const handleError = (error: unknown, context?: string): AppError => {
  let appError: AppError;

  if (error instanceof Error && 'type' in error) {
    appError = error as AppError;
  } else if (error instanceof Error) {
    appError = createAppError('UNKNOWN_ERROR', error.message, {
      context: { originalError: error }
    });
  } else {
    appError = createAppError('UNKNOWN_ERROR', ERROR_MESSAGES.UNKNOWN_ERROR, {
      context: { originalError: error }
    });
  }

  // Log error for debugging
  console.error(`Error${context ? ` in ${context}` : ''}:`, appError);

  // Show user-friendly toast notification
  toast({
    title: getErrorTitle(appError.type),
    description: appError.message,
    variant: 'destructive',
  });

  return appError;
};

/**
 * Gets user-friendly error titles based on error type
 */
const getErrorTitle = (type: ErrorType): string => {
  switch (type) {
    case 'NETWORK_ERROR':
      return 'Connection Error';
    case 'VALIDATION_ERROR':
      return 'Invalid Input';
    case 'AUTH_ERROR':
      return 'Authentication Error';
    case 'PERMISSION_ERROR':
      return 'Permission Denied';
    case 'NOT_FOUND_ERROR':
      return 'Not Found';
    case 'SERVER_ERROR':
      return 'Server Error';
    default:
      return 'Error';
  }
};

/**
 * Retry wrapper for async operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
};

/**
 * Safe async wrapper that catches and handles errors
 */
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context);
    return null;
  }
};