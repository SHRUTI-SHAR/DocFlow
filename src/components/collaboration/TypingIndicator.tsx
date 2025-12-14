import React from 'react';
import { TypingIndicator as TypingIndicatorType, CollaboratorPresence } from '@/types/collaboration';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface TypingIndicatorProps {
  indicators: TypingIndicatorType[];
  collaborators: CollaboratorPresence[];
  fieldId?: string;
  variant?: 'inline' | 'floating' | 'minimal';
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  indicators,
  collaborators,
  fieldId,
  variant = 'inline',
}) => {
  // Filter typing indicators for the specific field if provided
  const relevantIndicators = fieldId
    ? indicators.filter(i => i.field_id === fieldId)
    : indicators;

  if (relevantIndicators.length === 0) return null;

  const getCollaborator = (userId: string) => 
    collaborators.find(c => c.user_id === userId);

  const getNames = () => {
    const names = relevantIndicators.map(i => {
      const collaborator = getCollaborator(i.user_id);
      return collaborator?.user_name || collaborator?.user_email?.split('@')[0] || 'Someone';
    });

    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names[0]} and ${names.length - 1} others`;
  };

  if (variant === 'minimal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-1"
      >
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </motion.div>
    );
  }

  if (variant === 'floating') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute -top-8 left-0 z-50"
        >
          <div className="flex items-center gap-1 bg-card border rounded-full px-2 py-1 shadow-lg">
            <div className="flex -space-x-1">
              {relevantIndicators.slice(0, 3).map((indicator) => {
                const collaborator = getCollaborator(indicator.user_id);
                return (
                  <Avatar key={indicator.user_id} className="h-5 w-5 border-2 border-background">
                    <AvatarImage src={collaborator?.avatar_url} />
                    <AvatarFallback
                      style={{ backgroundColor: collaborator?.color }}
                      className="text-[8px] text-white"
                    >
                      {collaborator?.user_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground">typing</span>
            <div className="flex gap-0.5">
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Default inline variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground"
      >
        <div className="flex -space-x-2">
          {relevantIndicators.slice(0, 3).map((indicator) => {
            const collaborator = getCollaborator(indicator.user_id);
            return (
              <Avatar key={indicator.user_id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={collaborator?.avatar_url} />
                <AvatarFallback
                  style={{ backgroundColor: collaborator?.color }}
                  className="text-[10px] text-white"
                >
                  {collaborator?.user_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </div>
        <span>
          {getNames()} {relevantIndicators.length === 1 ? 'is' : 'are'} typing
        </span>
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TypingIndicator;
