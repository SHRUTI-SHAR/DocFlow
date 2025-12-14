/**
 * Application routing constants
 * Centralized route definitions for type-safe navigation
 */

export const ROUTES = {
  // Public routes
  AUTH: '/auth',
  
  // Protected routes
  HOME: '/',
  UPLOAD: '/upload',
  TEMPLATES: '/templates', 
  TEMPLATE_MANAGEMENT: '/templates/manage',
  WORKFLOWS: '/workflows',
  DOCUMENTS: '/documents',
  HISTORY: '/history',
  IMAGE_PREVIEW: '/image-preview',
  
  // Form management
  FORMS: '/forms',
  FORMS_CREATE: '/forms/create',
  FORMS_EDIT: (submissionId: string) => `/forms/edit/${submissionId}`,
  FORMS_RESPONSES: (formId: string) => `/forms/public/${formId}/responses`,
  FORMS_PUBLIC_EDIT: (formId: string) => `/forms/public/${formId}/edit`,
  FORMS_PUBLIC_VIEW: (slug: string) => `/forms/public/${slug}`,
  
  // Applications
  APPLICATIONS: '/applications',
  APPLICATIONS_EDIT: (applicationId: string) => `/applications/${applicationId}/edit`,
  
  // Settings
  SETTINGS: '/settings',
  
  // Fallback
  NOT_FOUND: '*'
} as const;

export type AppRoutes = typeof ROUTES[keyof typeof ROUTES];

/**
 * Navigation items configuration for main navigation
 */
export const NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: ROUTES.HOME,
    icon: 'Home'
  },
  {
    title: 'Upload',
    href: ROUTES.UPLOAD,
    icon: 'Upload'
  },
  {
    title: 'Templates',
    href: ROUTES.TEMPLATES,
    icon: 'FileTemplate'
  },
  {
    title: 'Documents',
    href: ROUTES.DOCUMENTS,
    icon: 'Files'
  },
  {
    title: 'Forms',
    href: ROUTES.FORMS,
    icon: 'FileText'
  },
  {
    title: 'Workflows',
    href: ROUTES.WORKFLOWS,
    icon: 'Workflow'
  },
  {
    title: 'History',
    href: ROUTES.HISTORY,
    icon: 'History'
  },
  {
    title: 'Applications',
    href: ROUTES.APPLICATIONS,
    icon: 'Layers'
  },
  {
    title: 'Image Preview',
    href: ROUTES.IMAGE_PREVIEW,
    icon: 'Eye'
  }
] as const;