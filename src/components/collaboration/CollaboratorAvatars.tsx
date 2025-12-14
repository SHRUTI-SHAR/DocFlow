import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CollaboratorPresence } from '@/types/collaboration';
import { Eye, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CollaboratorAvatarsProps {
  collaborators: CollaboratorPresence[];
  onFollowUser?: (userId: string) => void;
  followingUserId?: string;
  maxVisible?: number;
}

const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  collaborators,
  onFollowUser,
  followingUserId,
  maxVisible = 4,
}) => {
  const { user } = useAuth();
  
  const visibleCollaborators = collaborators.slice(0, maxVisible);
  const hiddenCount = Math.max(0, collaborators.length - maxVisible);
  const otherCollaborators = collaborators.filter(c => c.user_id !== user?.id);

  const getInitials = (collaborator: CollaboratorPresence) => {
    if (collaborator.user_name) {
      return collaborator.user_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return collaborator.user_email?.charAt(0).toUpperCase() || '?';
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'editing':
        return 'bg-green-500';
      case 'viewing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex -space-x-2">
          {visibleCollaborators.map((collaborator) => (
            <Tooltip key={collaborator.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                    style={{ borderColor: collaborator.color }}
                  >
                    <AvatarImage src={collaborator.avatar_url} />
                    <AvatarFallback
                      style={{ backgroundColor: collaborator.color }}
                      className="text-white text-xs"
                    >
                      {getInitials(collaborator)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${getStatusIndicator(collaborator.status)}`}
                  />
                  {followingUserId === collaborator.user_id && (
                    <Eye className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{collaborator.user_name || collaborator.user_email}</p>
                  <p className="text-muted-foreground capitalize">{collaborator.status}</p>
                  {collaborator.user_id === user?.id && (
                    <p className="text-xs text-muted-foreground">(You)</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}

          {hiddenCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background cursor-pointer bg-muted hover:bg-muted/80">
                  <AvatarFallback className="text-xs">
                    +{hiddenCount}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">
                  <Users className="h-4 w-4 inline mr-2" />
                  {collaborators.length} collaborators
                </div>
                <DropdownMenuSeparator />
                {collaborators.slice(maxVisible).map((collaborator) => (
                  <DropdownMenuItem key={collaborator.user_id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6" style={{ borderColor: collaborator.color }}>
                      <AvatarImage src={collaborator.avatar_url} />
                      <AvatarFallback
                        style={{ backgroundColor: collaborator.color }}
                        className="text-white text-[10px]"
                      >
                        {getInitials(collaborator)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">
                      {collaborator.user_name || collaborator.user_email}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${getStatusIndicator(collaborator.status)}`}
                    />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TooltipProvider>

      {onFollowUser && otherCollaborators.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
              <Eye className="h-3 w-3" />
              Follow
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5 text-sm font-medium">Follow Mode</div>
            <DropdownMenuSeparator />
            {otherCollaborators.map((collaborator) => (
              <DropdownMenuItem
                key={collaborator.user_id}
                onClick={() => onFollowUser(collaborator.user_id)}
                className="flex items-center gap-2"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={collaborator.avatar_url} />
                  <AvatarFallback
                    style={{ backgroundColor: collaborator.color }}
                    className="text-white text-[8px]"
                  >
                    {getInitials(collaborator)}
                  </AvatarFallback>
                </Avatar>
                <span>{collaborator.user_name || collaborator.user_email}</span>
                {followingUserId === collaborator.user_id && (
                  <Eye className="h-3 w-3 ml-auto text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default CollaboratorAvatars;
