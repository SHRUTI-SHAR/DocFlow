import { useState } from "react";
import { DocumentAnalysisService } from "@/services/documentAnalysis";
import type { AnalysisResult, AnalysisTask } from "@/types/document";
import { useToast } from "@/hooks/use-toast";

export const useDocumentAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analysisService = DocumentAnalysisService.getInstance();

  const analyzeDocument = async (
    documentData: string,
    task: AnalysisTask,
    documentName?: string
  ): Promise<AnalysisResult | null> => {
    try {
      setIsAnalyzing(true);
      setProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 300);

      const analysisResult = await analysisService.analyzeDocument(documentData, task, documentName);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(analysisResult);
      
      toast({
        title: "Analysis complete",
        description: `Successfully completed ${task} analysis`,
      });

      return analysisResult;
    } catch (error) {
      setProgress(0);
      
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : `Failed to complete ${task} analysis`,
        variant: "destructive",
      });

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setIsAnalyzing(false);
    setProgress(0);
    setResult(null);
  };

  return {
    isAnalyzing,
    progress,
    result,
    analyzeDocument,
    reset
  };
};