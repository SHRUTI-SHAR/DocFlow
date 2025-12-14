import { useState } from "react";
import { EnhancedTemplateMatchingService, type EnhancedTemplateMatch } from "@/services/enhancedTemplateMatching";
import type { Template } from "@/hooks/useTemplateManager";
import { useToast } from "@/hooks/use-toast";

export const useEnhancedTemplateMatching = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [matches, setMatches] = useState<EnhancedTemplateMatch[]>([]);
  const { toast } = useToast();

  const templateService = EnhancedTemplateMatchingService.getInstance();

  const findEnhancedMatches = async (
    documentData: string,
    documentName: string,
    availableTemplates: Template[],
    onProgress?: (progress: number, stage: string) => void
  ): Promise<EnhancedTemplateMatch[]> => {
    try {
      setIsMatching(true);
      setProgress(0);
      setCurrentStage('Initializing enhanced analysis...');
      
      const foundMatches = await templateService.findEnhancedMatches(
        documentData,
        documentName,
        availableTemplates,
        (progress: number, stage: string) => {
          setProgress(progress);
          setCurrentStage(stage);
          if (onProgress) {
            onProgress(progress, stage);
          }
        }
      );
      
      setMatches(foundMatches);
      
      if (foundMatches.length > 0) {
        const bestMatch = foundMatches[0];
        const qualityInfo = templateService.getEnhancedMatchQuality(bestMatch);
        
        toast({
          title: "Enhanced template analysis complete",
          description: `Found ${foundMatches.length} matches. Best match: ${bestMatch.name} (${qualityInfo.label})`,
        });
      } else {
        toast({
          title: "No enhanced matches found",
          description: "Consider creating a new template for this document type",
        });
      }

      return foundMatches;
    } catch (error) {
      setProgress(0);
      setMatches([]);
      
      toast({
        title: "Enhanced template analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze document with enhanced matching",
        variant: "destructive",
      });

      return [];
    } finally {
      setIsMatching(false);
      setCurrentStage('');
    }
  };

  const getBestMatch = (): EnhancedTemplateMatch | null => {
    return matches.length > 0 ? matches[0] : null;
  };

  const getMatchQuality = (match: EnhancedTemplateMatch) => {
    return templateService.getEnhancedMatchQuality(match);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-blue-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const hasGoodMatch = (): boolean => {
    return matches.some(match => match.confidence >= 0.6);
  };

  const hasExcellentMatch = (): boolean => {
    return matches.some(match => match.extractionQuality === 'excellent');
  };

  const getConfidenceExplanation = (match: EnhancedTemplateMatch): string => {
    return templateService.getConfidenceExplanation(match);
  };

  const getTopMatches = (limit: number = 3): EnhancedTemplateMatch[] => {
    return matches.slice(0, limit);
  };

  const getMatchesByQuality = (quality: 'excellent' | 'good' | 'fair' | 'poor'): EnhancedTemplateMatch[] => {
    return matches.filter(match => match.extractionQuality === quality);
  };

  const reset = () => {
    setIsMatching(false);
    setProgress(0);
    setCurrentStage('');
    setMatches([]);
  };

  return {
    // State
    isMatching,
    progress,
    currentStage,
    matches,
    
    // Actions
    findEnhancedMatches,
    reset,
    
    // Getters
    getBestMatch,
    getMatchQuality,
    getConfidenceColor,
    getConfidenceExplanation,
    getTopMatches,
    getMatchesByQuality,
    
    // Checks
    hasGoodMatch,
    hasExcellentMatch,
  };
};