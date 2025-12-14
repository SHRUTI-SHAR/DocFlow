import React from 'react';
import { ActiveEdit, CollaboratorPresence } from '@/types/collaboration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FieldEditIndicatorProps {
  activeEdit?: ActiveEdit;
  collaborator?: CollaboratorPresence;
  position?: 'top-left' | 'top-right' | 'inline';
  showName?: boolean;
}

const FieldEditIndicator: React.FC<FieldEditIndicatorProps> = ({
  activeEdit,
  collaborator,
  position = 'top-right',
  showName = false,
}) => {
  if (!activeEdit && !collaborator) return null;

  const displayColor = activeEdit?.user_color || collaborator?.color || '#6366F1';
  const displayName = activeEdit?.user_name || collaborator?.user_name || 'Someone';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const positionClasses = {
    'top-left': 'absolute -top-2 -left-2 z-20',
    'top-right': 'absolute -top-2 -right-2 z-20',
    'inline': 'inline-flex',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={positionClasses[position]}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <div
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5 shadow-sm"
                  style={{ 
                    backgroundColor: displayColor,
                    boxShadow: `0 0 0 2px white, 0 0 0 4px ${displayColor}40`,
                  }}
                >
                  <Avatar className="h-4 w-4 border border-white/50">
                    <AvatarImage src={collaborator?.avatar_url} />
                    <AvatarFallback 
                      className="text-[8px] text-white"
                      style={{ backgroundColor: displayColor }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {showName && (
                    <span className="text-[10px] text-white font-medium pr-1 max-w-[60px] truncate">
                      {displayName}
                    </span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3" />
                <span>{displayName} is editing this field</span>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </AnimatePresence>
  );
};

// Wrapper component for a field with edit indicator
interface CollaborativeFieldWrapperProps {
  children: React.ReactNode;
  fieldId: string;
  activeEdit?: ActiveEdit;
  collaborator?: CollaboratorPresence;
  isLocked?: boolean;
}

export const CollaborativeFieldWrapper: React.FC<CollaborativeFieldWrapperProps> = ({
  children,
  fieldId,
  activeEdit,
  collaborator,
  isLocked = false,
}) => {
  const hasActiveEditor = activeEdit || collaborator;
  const borderColor = activeEdit?.user_color || collaborator?.color || 'transparent';

  return (
    <div 
      className={`relative transition-all duration-200 ${isLocked ? 'opacity-75' : ''}`}
      style={{
        outline: hasActiveEditor ? `2px solid ${borderColor}` : undefined,
        outlineOffset: 2,
        borderRadius: 4,
      }}
    >
      {hasActiveEditor && (
        <FieldEditIndicator 
          activeEdit={activeEdit} 
          collaborator={collaborator}
          position="top-right"
        />
      )}
      {children}
    </div>
  );
};

export default FieldEditIndicator;
