import React from 'react';
import { Button } from "@/components/ui/button";
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StarButtonProps {
  documentId: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const buttonSizeClasses = {
  sm: 'h-7 w-7 p-0',
  md: 'h-8 w-8 p-0',
  lg: 'h-9 w-9 p-0',
};

export const StarButton: React.FC<StarButtonProps> = ({
  documentId,
  size = 'md',
  showTooltip = true,
  className,
  onToggle,
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isStarred = isFavorite(documentId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const success = await toggleFavorite(documentId);
    if (success && onToggle) {
      onToggle(!isStarred);
    }
  };

  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        buttonSizeClasses[size],
        'hover:bg-yellow-500/10 transition-all duration-200',
        className
      )}
      onClick={handleClick}
    >
      <Star
        className={cn(
          sizeClasses[size],
          'transition-all duration-200',
          isStarred 
            ? 'text-yellow-500 fill-yellow-500 scale-110' 
            : 'text-muted-foreground hover:text-yellow-500'
        )}
      />
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{isStarred ? 'Remove from favorites' : 'Add to favorites'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
