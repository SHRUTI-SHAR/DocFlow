import React from 'react';
import { AuditStats, AUDIT_CATEGORY_COLORS, AUDIT_CATEGORY_LABELS, AuditCategory } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  TrendingUp, 
  FileText, 
  Users,
  Clock,
  BarChart3,
} from 'lucide-react';

interface AuditStatsCardsProps {
  stats: AuditStats | null;
  isLoading?: boolean;
}

const AuditStatsCards: React.FC<AuditStatsCardsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Events',
      value: stats.total_events.toLocaleString(),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Today',
      value: stats.events_today.toLocaleString(),
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      change: stats.events_today > 0 ? `+${stats.events_today}` : '0',
    },
    {
      title: 'This Week',
      value: stats.events_this_week.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Active Documents',
      value: stats.most_active_documents.length.toString(),
      icon: FileText,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.change && (
                    <p className="text-xs text-green-500 mt-1">{stat.change} today</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Activity by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.action_breakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const total = Object.values(stats.action_breakdown).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: AUDIT_CATEGORY_COLORS[category as AuditCategory] }}
                        />
                        <span>{AUDIT_CATEGORY_LABELS[category as AuditCategory]}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: AUDIT_CATEGORY_COLORS[category as AuditCategory],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Most active */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most active documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Most Active Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.most_active_documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No document activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.most_active_documents.slice(0, 5).map((doc, index) => (
                  <div key={doc.document_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[180px]">{doc.document_name}</span>
                    </div>
                    <span className="text-sm font-medium">{doc.event_count} events</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most active users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.most_active_users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No user activity yet
              </p>
            ) : (
              <div className="space-y-3">
                {stats.most_active_users.slice(0, 5).map((user, index) => (
                  <div key={user.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[180px]">{user.user_name}</span>
                    </div>
                    <span className="text-sm font-medium">{user.event_count} events</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuditStatsCards;
