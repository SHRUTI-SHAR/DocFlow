import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  FileText, 
  CheckCircle, 
  TrendingUp,
  Target,
  Zap,
  MapPin
} from "lucide-react";
import type { EnhancedTemplateMatch } from "@/services/enhancedTemplateMatching";

interface EnhancedTemplateMatchCardProps {
  match: EnhancedTemplateMatch;
  onSelect?: (match: EnhancedTemplateMatch) => void;
  onViewDetails?: (match: EnhancedTemplateMatch) => void;
  showDetailedMetrics?: boolean;
}

export const EnhancedTemplateMatchCard: React.FC<EnhancedTemplateMatchCardProps> = ({
  match,
  onSelect,
  onViewDetails,
  showDetailedMetrics = false
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  // Debug the match object
  console.log('[EnhancedTemplateMatchCard] Match object:', match);
  console.log('[EnhancedTemplateMatchCard] matchedFieldNames type:', typeof match.matchedFieldNames);
  console.log('[EnhancedTemplateMatchCard] matchedFieldNames value:', match.matchedFieldNames);
  console.log('[EnhancedTemplateMatchCard] unmatchedFieldNames type:', typeof (match as any).unmatchedFieldNames);
  console.log('[EnhancedTemplateMatchCard] unmatchedFieldNames value:', (match as any).unmatchedFieldNames);
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500 text-white';
      case 'good': return 'bg-blue-500 text-white';
      case 'fair': return 'bg-yellow-500 text-black';
      case 'poor': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-blue-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Derive a user-facing confidence percentage that reflects the base
  // match (template vs extracted) and only uses the enhanced value
  // when bonuses are actually applied. This ensures that when all
  // template fields match and bonuses are 0, the progress bar shows 100%.
  // Compute confidence strictly as matched / total (requested behavior)
  const totalForConfidence = typeof match.totalFields === 'number' ? Math.max(1, match.totalFields) : 1;
  const matchedForConfidence = (() => {
    if (Array.isArray((match as any).matchedFields)) return ((match as any).matchedFields as unknown[]).length;
    if (typeof (match as any).matchedFields === 'number') return (match as any).matchedFields as number;
    if (Array.isArray((match as any).matchedFieldNames)) return ((match as any).matchedFieldNames as unknown[]).length;
    return 0;
  })();
  const confidencePercentage = Math.round((Math.min(matchedForConfidence, totalForConfidence) / totalForConfidence) * 100);

  // Prepare matched field names for details modal
  const matchedFieldNames: string[] = React.useMemo(() => {
    const raw = (match as any).matchedFieldNames ?? (match as any).matchedFields;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((v: any) => String(v)).filter(Boolean);
    }
    if (typeof raw === 'string') {
      if (raw.includes(',')) return raw.split(',').map(s => s.trim()).filter(Boolean);
      if (raw.includes(';')) return raw.split(';').map(s => s.trim()).filter(Boolean);
      // Fallback: split by whitespace when concatenated
      return raw.split(/\s+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [match]);

  // Use matchedFieldNames length as the source of truth since it represents actual template matches
  const matchedFieldsCount = matchedFieldNames.length;

  // Prepare unmatched field names for details modal
  const unmatchedFieldNames: string[] = React.useMemo(() => {
    const raw = (match as any).unmatchedFieldNames;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((v: any) => String(v)).filter(Boolean);
    }
    if (typeof raw === 'string') {
      if (raw.includes(',')) return raw.split(',').map(s => s.trim()).filter(Boolean);
      if (raw.includes(';')) return raw.split(';').map(s => s.trim()).filter(Boolean);
      // Fallback: split by whitespace when concatenated
      return raw.split(/\s+/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  }, [match]);

  return (
    <>
    <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {match.name}
              <Badge className={getQualityColor(match.extractionQuality)}>
                {match.extractionQuality}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {match.documentType} • Version {match.version}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getConfidenceColor(match.confidence)}`}>
              {confidencePercentage}%
            </div>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Confidence Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Match Confidence</span>
            <span className="font-medium">{confidencePercentage}%</span>
          </div>
          <Progress value={confidencePercentage} className="h-2" />
        </div>

        {/* Match Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{matchedFieldsCount} Matched Fields</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span>Total Fields: {match.totalFields}</span>
          </div>
          
          {showDetailedMetrics && (
            <>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span>Semantic: {match.semanticMatches}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                <span>Position: {match.positionMatches}</span>
              </div>
            </>
          )}
        </div>


        {/* Confidence Breakdown Details */}
        {showDetailedMetrics && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Confidence Breakdown
            </h4>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex justify-between">
                <span>Base Match:</span>
                <span>{Math.round(match.confidenceBreakdown.base * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Semantic Bonus:</span>
                <span>+{Math.round(match.confidenceBreakdown.semantic_bonus * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Position Bonus:</span>
                <span>+{Math.round(match.confidenceBreakdown.position_bonus * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onSelect && (
            <Button 
              onClick={() => onSelect(match)}
              className="flex-1"
              variant={match.extractionQuality === 'excellent' ? 'default' : 'secondary'}
            >
              Select Template
            </Button>
          )}
          <Button 
            onClick={() => {
              onViewDetails?.(match);
              setIsDetailsOpen(true);
            }}
            variant="outline"
            size="sm"
          >
            Details
          </Button>
        </div>
      </CardContent>
    </Card>

    {/* Details Modal */}
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> {match.name}
          </DialogTitle>
          <DialogDescription>
            Version {match.version} • {match.documentType}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />
              <span>{matchedFieldsCount} Matched Fields</span>
            </div>
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-500" />
              <span>Total Fields: {match.totalFields}</span>
            </div>
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-purple-500" />
              <span>Semantic Matches: {match.semanticMatches}</span>
            </div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-500" />
              <span>Position Matches: {match.positionMatches}</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="font-semibold text-xs flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Confidence Breakdown
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex justify-between"><span>Base Match</span><span>{Math.round(match.confidenceBreakdown.base * 100)}%</span></div>
              <div className="flex justify-between"><span>Semantic Bonus</span><span>+{Math.round(match.confidenceBreakdown.semantic_bonus * 100)}%</span></div>
              <div className="flex justify-between"><span>Position Bonus</span><span>+{Math.round(match.confidenceBreakdown.position_bonus * 100)}%</span></div>
              <div className="flex justify-between border-t pt-2 mt-1"><span>Total Confidence</span><span>{confidencePercentage}%</span></div>
            </div>
          </div>

          {/* Matched field names list */}
          {matchedFieldNames.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-xs flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Matched Fields ({matchedFieldNames.length})
              </div>
              <div className="flex flex-wrap gap-1 max-h-48 overflow-auto pr-1">
                {matchedFieldNames.map((name, idx) => (
                  <Badge key={`matched-${name}-${idx}`} variant="secondary" className="text-2xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Unmatched field names list */}
          {unmatchedFieldNames.length > 0 && (
            <div className="space-y-2">
              <div className="font-semibold text-xs flex items-center gap-2">
                <Target className="h-3 w-3 text-red-500" />
                Unmatched Fields ({unmatchedFieldNames.length})
              </div>
              <div className="flex flex-wrap gap-1 max-h-48 overflow-auto pr-1">
                {unmatchedFieldNames.map((name, idx) => (
                  <Badge key={`unmatched-${name}-${idx}`} variant="destructive" className="text-2xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};