import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DocumentActivity, ActivityActionType } from '@/types/collaboration';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Edit,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  GitBranch,
  RotateCcw,
  UserPlus,
  UserMinus,
  CheckCircle,
  Reply,
} from 'lucide-react';

interface ActivityFeedProps {
  activities: DocumentActivity[];
  maxHeight?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  maxHeight = '400px',
}) => {
  const getActivityIcon = (actionType: ActivityActionType) => {
    switch (actionType) {
      case 'comment_added':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'comment_replied':
        return <Reply className="h-4 w-4 text-blue-500" />;
      case 'comment_resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'field_edited':
        return <Edit className="h-4 w-4 text-amber-500" />;
      case 'field_created':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'field_deleted':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'document_locked':
        return <Lock className="h-4 w-4 text-orange-500" />;
      case 'document_unlocked':
        return <Unlock className="h-4 w-4 text-green-500" />;
      case 'version_created':
        return <GitBranch className="h-4 w-4 text-purple-500" />;
      case 'version_restored':
        return <RotateCcw className="h-4 w-4 text-purple-500" />;
      case 'collaborator_joined':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'collaborator_left':
        return <UserMinus className="h-4 w-4 text-gray-500" />;
      case 'follow_started':
      case 'follow_ended':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <Edit className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityText = (activity: DocumentActivity) => {
    const details = activity.action_details || {};
    
    switch (activity.action_type) {
      case 'comment_added':
        return 'added a comment';
      case 'comment_replied':
        return 'replied to a comment';
      case 'comment_resolved':
        return 'resolved a comment';
      case 'field_edited':
        return `edited ${activity.field_id ? `"${activity.field_id}"` : 'a field'}`;
      case 'field_created':
        return 'created a new field';
      case 'field_deleted':
        return 'deleted a field';
      case 'document_locked':
        return 'locked the document';
      case 'document_unlocked':
        return 'unlocked the document';
      case 'version_created':
        return 'created a new version';
      case 'version_restored':
        return 'restored a previous version';
      case 'collaborator_joined':
        return 'joined the document';
      case 'collaborator_left':
        return 'left the document';
      case 'follow_started':
        return 'started following';
      case 'follow_ended':
        return 'stopped following';
      case 'document_opened':
        return 'opened the document';
      case 'document_closed':
        return 'closed the document';
      default:
        return String(activity.action_type).replace(/_/g, ' ');
    }
  };

  const getActivityBadgeVariant = (actionType: ActivityActionType) => {
    switch (actionType) {
      case 'field_deleted':
        return 'destructive';
      case 'field_created':
      case 'collaborator_joined':
      case 'comment_resolved':
        return 'default';
      case 'field_edited':
      case 'comment_added':
      case 'comment_replied':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const groupActivitiesByDate = (activities: DocumentActivity[]) => {
    const groups: { [key: string]: DocumentActivity[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Edit className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs">Actions will appear here as you work</p>
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }}>
      <div className="space-y-4 p-2">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date}>
            <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-1 mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </span>
            </div>
            
            <div className="space-y-3">
              {dateActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.action_type as ActivityActionType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.user?.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {activity.user?.name?.charAt(0) || activity.user?.email?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <span className="text-sm font-medium truncate">
                        {activity.user?.name || activity.user?.email || 'Unknown user'}
                      </span>
                      
                      <span className="text-sm text-muted-foreground">
                        {getActivityText(activity)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                      
                      {activity.field_id && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {activity.field_id}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Show value changes for field edits */}
                    {activity.action_type === 'field_edited' && activity.old_value && activity.new_value && (
                      <div className="mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded line-through">
                            {String(activity.old_value).slice(0, 30)}
                            {String(activity.old_value).length > 30 && '...'}
                          </span>
                          <span>→</span>
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                            {String(activity.new_value).slice(0, 30)}
                            {String(activity.new_value).length > 30 && '...'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ActivityFeed;
