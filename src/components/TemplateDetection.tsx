import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  File,
  Zap,
  RefreshCw,
  Check
} from "lucide-react";
import { EnhancedTemplateMatchCard } from "@/components/EnhancedTemplateMatchCard";
import { useEnhancedTemplateMatching } from "@/hooks/useEnhancedTemplateMatching";
import { useTemplateManager } from "@/hooks/useTemplateManager";
import { useDocumentProcessingContext } from "@/contexts/DocumentProcessingContext";
import type { TemplateMatch } from "@/types/document";
import type { EnhancedTemplateMatch } from "@/services/enhancedTemplateMatching";

interface TemplateDetectionProps {
  documentName: string;
  documentData?: string; // base64 document data
  onTemplateSelected: (template: TemplateMatch | EnhancedTemplateMatch) => void;
  onCreateNew: () => void;
}

export const TemplateDetection = ({ documentName, documentData, onTemplateSelected, onCreateNew }: TemplateDetectionProps) => {
  const {
    templateMatches: matches,
    isTemplateMatching: isAnalyzing,
    templateMatchingProgress: progress,
    setTemplateMatches,
    setIsTemplateMatching,
    setTemplateMatchingProgress
  } = useDocumentProcessingContext();
  
  // Enhanced template matching services
  const {
    findEnhancedMatches,
    getBestMatch: getEnhancedBestMatch,
    getMatchQuality: getEnhancedMatchQuality,
    getConfidenceColor: getEnhancedConfidenceColor,
    hasGoodMatch: hasEnhancedGoodMatch,
    matches: enhancedMatches,
    isMatching: isEnhancedMatching,
    currentStage: enhancedStage
  } = useEnhancedTemplateMatching();
  
  // Template manager for available templates
  const { templates, fetchTemplates } = useTemplateManager();

  const [currentStage, setCurrentStage] = useState('Initializing...');
  const [completedSteps, setCompletedSteps] = useState<{
    layoutAnalysis: boolean;
    templateMatching: boolean;
    fieldComparison: boolean;
  }>({
    layoutAnalysis: false,
    templateMatching: false,
    fieldComparison: false
  });

  const findMatches = async (docData: string, docName: string) => {
    console.log('[TemplateDetection] Starting template matching with', templates.length, 'templates');
    console.log('[TemplateDetection] Available templates:', templates.map(t => ({ id: t.id, name: t.name, document_type: t.document_type, field_count: t.field_count })));
    
    setIsTemplateMatching(true);
    setTemplateMatchingProgress(0);
    setCurrentStage('Initializing enhanced analysis...');
    setCompletedSteps({
      layoutAnalysis: false,
      templateMatching: false,
      fieldComparison: false
    });
    
    try {
      // Use enhanced template matching with available templates
      const results = await findEnhancedMatches(
        docData, 
        docName, 
        templates,
        (progress: number, stage: string) => {
          setTemplateMatchingProgress(progress);
          setCurrentStage(stage);
          
          // Update completed steps based on progress
          setCompletedSteps(prev => ({
            layoutAnalysis: progress >= 25, // Layout Analysis completes at 25%
            templateMatching: progress >= 65, // Template Matching completes at 65%
            fieldComparison: progress >= 85 // Field Comparison completes at 85%
          }));
        }
      );
      
      // Convert enhanced matches to regular matches for context compatibility
      const compatibleResults: TemplateMatch[] = results.map(match => ({
        id: match.id,
        name: match.name,
        confidence: match.confidence,
        version: match.version,
        documentType: match.documentType,
        // Normalize matchedFields to a number (handle array/string cases) and clamp to totalFields
        matchedFields: (() => {
          const raw = Array.isArray((match as any).matchedFields)
            ? ((match as any).matchedFields as unknown[]).length
            : (typeof (match as any).matchedFields === 'number' ? (match as any).matchedFields as number : 0);
          const total = match.totalFields || raw || 0;
          return Math.min(raw || 0, total);
        })(),
        totalFields: match.totalFields,
        totalExtractedFields: match.totalExtractedFields,
        matchedFieldNames: match.matchedFieldNames
      }));
      
      setTemplateMatches(compatibleResults);
    } catch (error) {
      console.error('Enhanced template matching failed:', error);
      setTemplateMatches([]);
      setTemplateMatchingProgress(0);
      setCurrentStage('Enhanced analysis failed');
      setCompletedSteps({
        layoutAnalysis: false,
        templateMatching: false,
        fieldComparison: false
      });
    } finally {
      setIsTemplateMatching(false);
    }
  };

  // Fetch templates when component mounts and reset any auto-start state
  useEffect(() => {
    fetchTemplates();
    // Reset any auto-start state that might have been restored from localStorage
    setIsTemplateMatching(false);
    setTemplateMatchingProgress(0);
  }, [fetchTemplates, setIsTemplateMatching, setTemplateMatchingProgress]);

  // Ensure overflow is always restored when template matches are rendered or updated
  // This ensures scrollbar appears when content exceeds viewport
  useEffect(() => {
    const restoreOverflow = () => {
      document.body.style.overflow = '';
      document.body.style.overflowY = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overflowY = '';
    };
    
    // Restore overflow immediately when component mounts or matches change
    restoreOverflow();
    
    // Also restore after a short delay to ensure it runs after any Dialog effects
    const timeoutId = setTimeout(restoreOverflow, 100);
    
    return () => clearTimeout(timeoutId);
  }, [enhancedMatches.length, matches.length, isAnalyzing, isEnhancedMatching]);

  // Removed auto-start template detection
  // Users should manually trigger template detection if needed

  // Debug logging
  console.log('[TemplateDetection] State check:', {
    isAnalyzing,
    isEnhancedMatching,
    enhancedMatchesLength: enhancedMatches.length,
    matchesLength: matches.length,
    documentData: !!documentData,
    templatesLength: templates.length
  });

  // Show manual start button when not analyzing and no results
  if (!isAnalyzing && !isEnhancedMatching && enhancedMatches.length === 0 && matches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="mb-6">
          <Search className="h-16 w-16 mx-auto text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Ready for Template Detection</h3>
          <p className="text-muted-foreground mb-6">
            Click the button below to start AI-powered template matching for your document
          </p>
        </div>
        
        <Button 
          onClick={() => {
            if (documentData) {
              findMatches(documentData, documentName);
            }
          }}
          disabled={!documentData || templates.length === 0}
          size="lg"
          className="mb-4"
        >
          <Search className="mr-2 h-5 w-5" />
          Start Template Detection
        </Button>
        
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No templates available. Please create a template first.
          </p>
        )}
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse mb-6">
          <Search className="h-16 w-16 mx-auto text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-4">Analyzing Document Structure</h3>
        <p className="text-muted-foreground mb-6">
          {currentStage}
        </p>
        
        <div className="max-w-md mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Enhanced Template Matching</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className={`flex items-center justify-center gap-2 transition-colors duration-300 ${
              completedSteps.layoutAnalysis 
                ? 'text-green-600' 
                : 'text-muted-foreground'
            }`}>
              {completedSteps.layoutAnalysis ? (
                <Check className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Layout Analysis
            </div>
            <div className={`flex items-center justify-center gap-2 transition-colors duration-300 ${
              completedSteps.templateMatching 
                ? 'text-green-600' 
                : 'text-muted-foreground'
            }`}>
              {completedSteps.templateMatching ? (
                <Check className="h-4 w-4" />
              ) : (
                <File className="h-4 w-4" />
              )}
              Template Matching
            </div>
            <div className={`flex items-center justify-center gap-2 transition-colors duration-300 ${
              completedSteps.fieldComparison 
                ? 'text-green-600' 
                : 'text-muted-foreground'
            }`}>
              {completedSteps.fieldComparison ? (
                <Check className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Field Comparison
            </div>
          </div>
      </Card>
    );
  }

  const currentHasGoodMatch = hasEnhancedGoodMatch();

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold">Enhanced Template Detection Results</h3>
            <p className="text-muted-foreground">
              Found {enhancedMatches.length || matches.length} enhanced template matches for "{documentName}"
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (documentData) {
                findMatches(documentData, documentName);
              }
            }}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
        </div>

        {currentHasGoodMatch ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Compatible templates found</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">No high-confidence matches found</span>
          </div>
        )}
      </Card>

      {/* Enhanced Template Matches */}
      {(enhancedMatches.length > 0 || matches.length > 0) && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Enhanced Template Matches</h4>
          <div className="space-y-4">
            {enhancedMatches.length > 0 ? (
              // Show enhanced matches if available
              enhancedMatches.map(match => (
                <EnhancedTemplateMatchCard
                  key={match.id}
                  match={match}
                  onSelect={(enhancedMatch) => onTemplateSelected(enhancedMatch)}
                  onViewDetails={(enhancedMatch) => {
                    console.log('Enhanced match details:', enhancedMatch);
                  }}
                  showDetailedMetrics={true}
                />
              ))
            ) : (
              // Fallback to regular matches if enhanced not available
              matches.map(match => {
                // Convert to enhanced match for display
                const enhancedMatch: EnhancedTemplateMatch = {
                  ...match,
                  semanticMatches: Math.floor(match.matchedFields * 0.8),
                  positionMatches: Math.floor(match.matchedFields * 0.6),
                  confidenceBreakdown: {
                    base: match.confidence * 0.8,
                    semantic_bonus: match.confidence * 0.1,
                    position_bonus: match.confidence * 0.1
                  },
                  extractionQuality: match.confidence >= 0.9 ? 'excellent' : 
                                   match.confidence >= 0.8 ? 'good' : 
                                   match.confidence >= 0.6 ? 'fair' : 'poor',
                  improvementSuggestions: []
                };
                
                return (
                  <EnhancedTemplateMatchCard
                    key={match.id}
                    match={enhancedMatch}
                    onSelect={() => onTemplateSelected(match)}
                    showDetailedMetrics={false}
                  />
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* No matches found - simplified fallback */}
      {(!isAnalyzing && !isEnhancedMatching && 
        (enhancedMatches.length === 0 && matches.length === 0)) && (
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No matching templates found. You can browse available templates or process without one.
          </p>
        </Card>
      )}
    </div>
  );
};