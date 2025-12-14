// Version Control Components
export { VersionHistory } from './VersionHistory';
export { VersionComparison } from './VersionComparison';
export { DocumentLockBanner } from './DocumentLockBanner';
export { AutoVersioningControls } from './AutoVersioningControls';
export { CreateBranchDialog } from './CreateBranchDialog';

// Document Comparison Components (Best-in-class)
export { DocumentComparisonView, VisualDocumentComparison, DocumentComparisonDialog } from '@/components/document-comparison';

// Re-export hooks
export { useDocumentVersions } from '@/hooks/useDocumentVersions';
export { useDocumentLock } from '@/hooks/useDocumentLock';
export { useAutoVersioning } from '@/hooks/useAutoVersioning';

// Re-export types
export type {
  DocumentVersion,
  DocumentLock,
  VersionBranch,
  VersionComment,
  LockNotification,
  AutoVersioningSettings,
  VersionComparison as VersionComparisonType,
  VersionDiff,
  CreateVersionParams,
  RestoreVersionParams,
  CreateBranchParams,
  MergeBranchParams,
  LockDocumentParams,
} from '@/types/versionControl';
