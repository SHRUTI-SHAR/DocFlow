import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TemplateMatch } from "@/types/document";

interface TemplateMatchCardProps {
  match: TemplateMatch;
  onSelect: (match: TemplateMatch) => void;
  onPreview?: (match: TemplateMatch) => void;
  getMatchQuality: (confidence: number) => { label: string; color: string };
  getConfidenceColor: (confidence: number) => string;
}

export const TemplateMatchCard = ({ 
  match, 
  onSelect, 
  onPreview,
  getMatchQuality,
  getConfidenceColor 
}: TemplateMatchCardProps) => {
  const quality = getMatchQuality(match.confidence);
  
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-medium transition-smooth">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h5 className="font-semibold">{match.name}</h5>
          <Badge variant="outline">v{match.version}</Badge>
          <Badge variant="outline">{match.documentType}</Badge>
          <Badge className={`${quality.color} text-white`}>
            {quality.label}
          </Badge>
        </div>
        
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <span className={`font-medium ${getConfidenceColor(match.confidence)}`}>
            {Math.round((match.confidence <= 1 ? match.confidence * 100 : match.confidence))}% confidence
          </span>
          <span>
            {match.matchedFields}/{match.totalExtractedFields || match.totalFields} fields matched
          </span>
        </div>

        <div className="mt-2">
          <Progress 
            value={Math.round((match.confidence <= 1 ? match.confidence * 100 : match.confidence))} 
            className="h-2 w-32" 
          />
        </div>
      </div>

      <div className="flex gap-2">
        {onPreview && (
          <Button variant="outline" size="sm" onClick={() => onPreview(match)}>
            Preview
          </Button>
        )}
        <Button 
          variant={(match.confidence <= 1 ? match.confidence * 100 : match.confidence) >= 85 ? "hero" : "default"}
          size="sm"
          onClick={() => onSelect(match)}
        >
          Use Template
        </Button>
      </div>
    </div>
  );
};