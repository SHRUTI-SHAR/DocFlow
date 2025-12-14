// ============= Advanced Annotations System Types =============

export type AnnotationType = 
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'box'
  | 'circle'
  | 'arrow'
  | 'freehand'
  | 'text'
  | 'stamp'
  | 'pin'
  | 'area';

export type AnnotationColor = 
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'purple'
  | 'orange'
  | 'red';

export const ANNOTATION_COLORS: Record<AnnotationColor, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'hsl(48 96% 89%)', border: 'hsl(48 96% 53%)', text: 'hsl(48 96% 20%)' },
  green: { bg: 'hsl(142 76% 89%)', border: 'hsl(142 76% 36%)', text: 'hsl(142 76% 20%)' },
  blue: { bg: 'hsl(217 91% 89%)', border: 'hsl(217 91% 60%)', text: 'hsl(217 91% 20%)' },
  pink: { bg: 'hsl(330 81% 89%)', border: 'hsl(330 81% 60%)', text: 'hsl(330 81% 20%)' },
  purple: { bg: 'hsl(263 70% 89%)', border: 'hsl(263 70% 50%)', text: 'hsl(263 70% 20%)' },
  orange: { bg: 'hsl(25 95% 89%)', border: 'hsl(25 95% 53%)', text: 'hsl(25 95% 20%)' },
  red: { bg: 'hsl(0 84% 89%)', border: 'hsl(0 84% 60%)', text: 'hsl(0 84% 20%)' },
};

export type StampType = 
  | 'approved'
  | 'rejected'
  | 'draft'
  | 'confidential'
  | 'urgent'
  | 'reviewed'
  | 'final'
  | 'custom';

export interface Annotation {
  id: string;
  document_id: string;
  user_id: string;
  type: AnnotationType;
  color: AnnotationColor;
  // Position data
  page?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  // For text selections
  selection_start?: number;
  selection_end?: number;
  selected_text?: string;
  // For shapes
  points?: Array<{ x: number; y: number }>;
  end_x?: number;
  end_y?: number;
  // For stamps
  stamp_type?: StampType;
  stamp_text?: string;
  // For text annotations
  text_content?: string;
  font_size?: number;
  // Metadata
  opacity?: number;
  stroke_width?: number;
  is_locked?: boolean;
  is_hidden?: boolean;
  layer_order?: number;
  // Associated comment
  comment_id?: string;
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface AnnotationGroup {
  id: string;
  document_id: string;
  name: string;
  color: AnnotationColor;
  annotation_ids: string[];
  is_visible: boolean;
  created_at: string;
}

// Enhanced Comment with rich text support
export interface EnhancedComment {
  id: string;
  document_id: string;
  user_id: string;
  parent_id?: string;
  // Content
  content: string;
  rich_content?: RichTextContent;
  // Attachments
  attachments?: CommentAttachment[];
  // Location
  anchor_type: 'text' | 'annotation' | 'page' | 'field' | 'general';
  anchor_id?: string;
  selection_start?: number;
  selection_end?: number;
  selected_text?: string;
  page?: number;
  x?: number;
  y?: number;
  // Status
  status: 'open' | 'resolved' | 'wontfix';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
  // Assignment
  assigned_to?: string;
  due_date?: string;
  // Mentions & notifications
  mentions?: CommentMention[];
  // Reactions
  reactions?: CommentReaction[];
  // Threading
  replies?: EnhancedComment[];
  reply_count?: number;
  // Audit
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
  edited_at?: string;
  is_edited?: boolean;
  // User info
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface RichTextContent {
  type: 'doc';
  content: RichTextNode[];
}

export interface RichTextNode {
  type: 'paragraph' | 'heading' | 'bulletList' | 'orderedList' | 'listItem' | 'codeBlock' | 'blockquote' | 'mention' | 'text';
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
}

export interface RichTextMark {
  type: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link';
  attrs?: Record<string, unknown>;
}

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  uploaded_at: string;
}

export interface CommentMention {
  id: string;
  comment_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  notified: boolean;
  notified_at?: string;
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  user_name?: string;
  emoji: string;
  created_at: string;
}

export interface CommentLabel {
  id: string;
  name: string;
  color: AnnotationColor;
  description?: string;
  workspace_id?: string;
}

// Comment filtering
export interface CommentFilter {
  status?: ('open' | 'resolved' | 'wontfix')[];
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  labels?: string[];
  authors?: string[];
  assignees?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  hasAttachments?: boolean;
  hasMentions?: boolean;
  mentionsMe?: boolean;
  assignedToMe?: boolean;
  unread?: boolean;
  searchQuery?: string;
}

export interface CommentSortOption {
  field: 'created_at' | 'updated_at' | 'priority' | 'status' | 'reply_count';
  direction: 'asc' | 'desc';
}

// Annotation tools
export interface AnnotationTool {
  type: AnnotationType;
  label: string;
  icon: string;
  shortcut?: string;
  description: string;
}

export const ANNOTATION_TOOLS: AnnotationTool[] = [
  { type: 'highlight', label: 'Highlight', icon: 'Highlighter', shortcut: 'H', description: 'Highlight text' },
  { type: 'underline', label: 'Underline', icon: 'Underline', shortcut: 'U', description: 'Underline text' },
  { type: 'strikethrough', label: 'Strikethrough', icon: 'Strikethrough', shortcut: 'S', description: 'Strike through text' },
  { type: 'box', label: 'Rectangle', icon: 'Square', shortcut: 'R', description: 'Draw a rectangle' },
  { type: 'circle', label: 'Ellipse', icon: 'Circle', shortcut: 'E', description: 'Draw an ellipse' },
  { type: 'arrow', label: 'Arrow', icon: 'ArrowRight', shortcut: 'A', description: 'Draw an arrow' },
  { type: 'freehand', label: 'Freehand', icon: 'Pencil', shortcut: 'F', description: 'Draw freely' },
  { type: 'text', label: 'Text', icon: 'Type', shortcut: 'T', description: 'Add text note' },
  { type: 'stamp', label: 'Stamp', icon: 'Stamp', shortcut: 'M', description: 'Add a stamp' },
  { type: 'pin', label: 'Pin', icon: 'MapPin', shortcut: 'P', description: 'Add a pin comment' },
  { type: 'area', label: 'Area', icon: 'Scan', shortcut: 'D', description: 'Select area to comment' },
];

export const STAMP_TYPES: Record<StampType, { label: string; color: AnnotationColor }> = {
  approved: { label: 'APPROVED', color: 'green' },
  rejected: { label: 'REJECTED', color: 'red' },
  draft: { label: 'DRAFT', color: 'yellow' },
  confidential: { label: 'CONFIDENTIAL', color: 'red' },
  urgent: { label: 'URGENT', color: 'orange' },
  reviewed: { label: 'REVIEWED', color: 'blue' },
  final: { label: 'FINAL', color: 'green' },
  custom: { label: 'Custom', color: 'purple' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: 'text-muted-foreground', icon: 'Minus' },
  medium: { label: 'Medium', color: 'text-blue-500', icon: 'Equal' },
  high: { label: 'High', color: 'text-orange-500', icon: 'ChevronUp' },
  urgent: { label: 'Urgent', color: 'text-destructive', icon: 'AlertTriangle' },
};

export const REACTION_EMOJIS = ['👍', '👎', '❤️', '🎉', '🤔', '👀', '🔥', '✅', '❌', '💡', '🙌', '👏'];
