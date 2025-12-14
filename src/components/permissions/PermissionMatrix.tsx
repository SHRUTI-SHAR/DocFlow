import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Minus } from 'lucide-react';
import { 
  PermissionLevel, 
  PermissionAction, 
  PERMISSION_MATRIX,
  PERMISSION_LEVEL_INFO,
  PERMISSION_HIERARCHY
} from '@/types/permissions';
import { cn } from '@/lib/utils';

interface PermissionMatrixProps {
  selectedLevel?: PermissionLevel;
  customActions?: PermissionAction[];
  deniedActions?: PermissionAction[];
  onCustomActionsChange?: (actions: PermissionAction[]) => void;
  onDeniedActionsChange?: (actions: PermissionAction[]) => void;
  editable?: boolean;
}

// Group actions by category
const ACTION_CATEGORIES: Record<string, { label: string; actions: PermissionAction[] }> = {
  view: {
    label: 'View',
    actions: ['view', 'view_metadata', 'view_history', 'view_comments', 'view_permissions']
  },
  comment: {
    label: 'Comments',
    actions: ['add_comment', 'edit_own_comment', 'delete_own_comment', 'resolve_comment']
  },
  content: {
    label: 'Content',
    actions: ['suggest_edit', 'edit', 'create_version', 'restore_version', 'delete_version']
  },
  file: {
    label: 'File',
    actions: ['download', 'print', 'export', 'copy']
  },
  share: {
    label: 'Sharing',
    actions: ['share_view', 'share_edit', 'share_admin', 'create_link', 'manage_link']
  },
  manage: {
    label: 'Management',
    actions: ['manage_permissions', 'manage_settings', 'lock', 'unlock', 'archive', 'unarchive', 'move', 'rename', 'delete', 'transfer_ownership']
  }
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'View Document',
  view_metadata: 'View Metadata',
  view_history: 'View History',
  view_comments: 'View Comments',
  view_permissions: 'View Permissions',
  add_comment: 'Add Comment',
  edit_own_comment: 'Edit Own Comments',
  delete_own_comment: 'Delete Own Comments',
  resolve_comment: 'Resolve Comments',
  suggest_edit: 'Suggest Edits',
  edit: 'Edit Content',
  create_version: 'Create Version',
  restore_version: 'Restore Version',
  delete_version: 'Delete Version',
  download: 'Download',
  print: 'Print',
  export: 'Export',
  copy: 'Copy Content',
  share_view: 'Share as Viewer',
  share_edit: 'Share as Editor',
  share_admin: 'Share as Admin',
  create_link: 'Create Share Link',
  manage_link: 'Manage Links',
  manage_permissions: 'Manage Permissions',
  manage_settings: 'Manage Settings',
  lock: 'Lock Document',
  unlock: 'Unlock Document',
  archive: 'Archive',
  unarchive: 'Unarchive',
  move: 'Move',
  rename: 'Rename',
  delete: 'Delete',
  transfer_ownership: 'Transfer Ownership'
};

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  selectedLevel,
  customActions = [],
  deniedActions = [],
  onCustomActionsChange,
  onDeniedActionsChange,
  editable = false
}) => {
  const [activeCategory, setActiveCategory] = useState('view');

  const hasAction = (level: PermissionLevel, action: PermissionAction): boolean => {
    return PERMISSION_MATRIX[level]?.includes(action) || false;
  };

  const isCustomEnabled = (action: PermissionAction): boolean => {
    return customActions.includes(action);
  };

  const isDenied = (action: PermissionAction): boolean => {
    return deniedActions.includes(action);
  };

  const toggleCustomAction = (action: PermissionAction) => {
    if (!onCustomActionsChange) return;
    
    if (customActions.includes(action)) {
      onCustomActionsChange(customActions.filter(a => a !== action));
    } else {
      onCustomActionsChange([...customActions, action]);
      // Remove from denied if adding to custom
      if (deniedActions.includes(action) && onDeniedActionsChange) {
        onDeniedActionsChange(deniedActions.filter(a => a !== action));
      }
    }
  };

  const toggleDeniedAction = (action: PermissionAction) => {
    if (!onDeniedActionsChange) return;
    
    if (deniedActions.includes(action)) {
      onDeniedActionsChange(deniedActions.filter(a => a !== action));
    } else {
      onDeniedActionsChange([...deniedActions, action]);
      // Remove from custom if adding to denied
      if (customActions.includes(action) && onCustomActionsChange) {
        onCustomActionsChange(customActions.filter(a => a !== action));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Permission Matrix</CardTitle>
        <CardDescription>
          View what each permission level can do
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-6 w-full mb-4">
            {Object.entries(ACTION_CATEGORIES).map(([key, { label }]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(ACTION_CATEGORIES).map(([categoryKey, { actions }]) => (
            <TabsContent key={categoryKey} value={categoryKey}>
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-2 py-2 border-b sticky top-0 bg-background z-10">
                    <div className="font-medium text-sm">Action</div>
                    {PERMISSION_HIERARCHY.map((level) => (
                      <div 
                        key={level} 
                        className={cn(
                          "text-center text-xs font-medium",
                          selectedLevel === level && "text-primary"
                        )}
                      >
                        {PERMISSION_LEVEL_INFO[level].label}
                      </div>
                    ))}
                  </div>

                  {/* Action rows */}
                  {actions.map((action) => (
                    <div 
                      key={action}
                      className={cn(
                        "grid grid-cols-[200px_repeat(7,1fr)] gap-2 py-2 border-b border-border/50 hover:bg-muted/30",
                        isDenied(action) && "bg-destructive/10",
                        isCustomEnabled(action) && "bg-primary/10"
                      )}
                    >
                      <div className="text-sm flex items-center gap-2">
                        {ACTION_LABELS[action]}
                        {editable && (
                          <div className="flex gap-1 ml-auto">
                            <button
                              onClick={() => toggleCustomAction(action)}
                              className={cn(
                                "p-1 rounded hover:bg-primary/20",
                                isCustomEnabled(action) && "bg-primary/20"
                              )}
                              title="Force enable"
                            >
                              <Check className="h-3 w-3 text-primary" />
                            </button>
                            <button
                              onClick={() => toggleDeniedAction(action)}
                              className={cn(
                                "p-1 rounded hover:bg-destructive/20",
                                isDenied(action) && "bg-destructive/20"
                              )}
                              title="Force deny"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {PERMISSION_HIERARCHY.map((level) => {
                        const has = hasAction(level, action);
                        const isSelected = selectedLevel === level;
                        
                        return (
                          <div 
                            key={level}
                            className={cn(
                              "flex items-center justify-center",
                              isSelected && "bg-primary/5 rounded"
                            )}
                          >
                            {isDenied(action) ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : isCustomEnabled(action) || has ? (
                              <Check className={cn(
                                "h-4 w-4",
                                isCustomEnabled(action) ? "text-primary" : "text-green-500"
                              )} />
                            ) : (
                              <Minus className="h-4 w-4 text-muted-foreground/30" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            <span>Allowed</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-primary" />
            <span>Custom enabled</span>
          </div>
          <div className="flex items-center gap-1">
            <X className="h-3 w-3 text-destructive" />
            <span>Denied</span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="h-3 w-3 text-muted-foreground/30" />
            <span>Not allowed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
