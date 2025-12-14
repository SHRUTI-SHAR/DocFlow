import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'lucide-react';
import { useDocumentShortcuts } from '@/hooks/useDocumentShortcuts';

interface ShortcutsBadgeProps {
  documentId: string;
  className?: string;
}

export const ShortcutsBadge: React.FC<ShortcutsBadgeProps> = ({
  documentId,
  className = '',
}) => {
  const { getShortcutsForDocument } = useDocumentShortcuts();
  const shortcuts = getShortcutsForDocument(documentId);

  if (shortcuts.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 flex items-center gap-1 cursor-default ${className}`}
          >
            <Link className="h-3 w-3" />
            {shortcuts.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {shortcuts.length} shortcut{shortcuts.length !== 1 ? 's' : ''} in other folders
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
