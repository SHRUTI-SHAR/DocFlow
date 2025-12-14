import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  TrendingUp, 
  FileText, 
  Clock, 
  Star,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  insights?: DocumentInsight;
  tags?: DocumentTag[];
}

interface DocumentInsight {
  summary: string;
  key_topics: string[];
  importance_score: number;
  estimated_reading_time: number;
  ai_generated_title: string;
  suggested_actions: string[];
}

interface DocumentTag {
  id: string;
  name: string;
  is_ai_suggested: boolean;
  confidence_score: number;
}

interface DocumentInsightsProps {
  documents: Document[];
}

export const DocumentInsights: React.FC<DocumentInsightsProps> = ({ documents }) => {
  // Calculate insights from documents
  const totalDocuments = documents.length;
  const documentsWithInsights = documents.filter(doc => doc.insights).length;
  const avgImportanceScore = documents.reduce((sum, doc) => 
    sum + (doc.insights?.importance_score || 0), 0) / totalDocuments || 0;
  const totalReadingTime = documents.reduce((sum, doc) => 
    sum + (doc.insights?.estimated_reading_time || 0), 0);

  // Get most common topics
  const topicCounts: { [key: string]: number } = {};
  documents.forEach(doc => {
    doc.insights?.key_topics?.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });
  });
  const mostCommonTopics = Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Get document type distribution
  const typeDistribution: { [key: string]: number } = {};
  documents.forEach(doc => {
    const type = doc.file_type.split('/')[1] || doc.file_type;
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });

  // Get importance distribution
  const importanceRanges = {
    high: documents.filter(doc => (doc.insights?.importance_score || 0) >= 0.8).length,
    medium: documents.filter(doc => {
      const score = doc.insights?.importance_score || 0;
      return score >= 0.5 && score < 0.8;
    }).length,
    low: documents.filter(doc => (doc.insights?.importance_score || 0) < 0.5).length
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">AI Insights</h3>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                  {documentsWithInsights}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">AI Analyzed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                  {Math.round(totalReadingTime)}m
                </p>
                <p className="text-xs text-purple-700 dark:text-purple-300">Reading Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Importance Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Star className="w-4 h-4" />
            Document Importance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                High Priority
              </span>
              <span>{importanceRanges.high}</span>
            </div>
            <Progress 
              value={(importanceRanges.high / totalDocuments) * 100} 
              className="h-1"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Medium Priority
              </span>
              <span>{importanceRanges.medium}</span>
            </div>
            <Progress 
              value={(importanceRanges.medium / totalDocuments) * 100} 
              className="h-1"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Low Priority
              </span>
              <span>{importanceRanges.low}</span>
            </div>
            <Progress 
              value={(importanceRanges.low / totalDocuments) * 100} 
              className="h-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Topics */}
      {mostCommonTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Common Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mostCommonTopics.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Types */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            File Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(typeDistribution).slice(0, 4).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs capitalize">{type}</span>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(count / totalDocuments) * 100} 
                    className="w-16 h-1"
                  />
                  <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
        <CardContent className="p-3">
          <div className="text-center">
            <p className="text-sm font-medium mb-1">AI Processing Rate</p>
            <p className="text-2xl font-bold text-primary">
              {totalDocuments > 0 ? Math.round((documentsWithInsights / totalDocuments) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">
              {documentsWithInsights} of {totalDocuments} documents analyzed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};