import type { TemplateMatch, AnalysisResult } from "@/types/document";
import type { Template } from "@/hooks/useTemplateManager";
import { DocumentAnalysisService } from "./documentAnalysis";
import { TemplateLearningService } from "./templateLearning";

export interface EnhancedTemplateMatch extends TemplateMatch {
  semanticMatches: number;
  positionMatches: number;
  confidenceBreakdown: {
    base: number;
    semantic_bonus: number;
    position_bonus: number;
  };
  extractionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  improvementSuggestions: string[];
}

export class EnhancedTemplateMatchingService {
  private static instance: EnhancedTemplateMatchingService;
  private analysisService: DocumentAnalysisService;
  private learningService: TemplateLearningService;

  constructor() {
    this.analysisService = DocumentAnalysisService.getInstance();
    this.learningService = TemplateLearningService.getInstance();
  }

  static getInstance(): EnhancedTemplateMatchingService {
    if (!EnhancedTemplateMatchingService.instance) {
      EnhancedTemplateMatchingService.instance = new EnhancedTemplateMatchingService();
    }
    return EnhancedTemplateMatchingService.instance;
  }

  /**
   * Find enhanced template matches with semantic analysis
   */
  async findEnhancedMatches(
    documentData: string,
    documentName: string,
    availableTemplates: Template[],
    onProgress?: (progress: number, stage: string) => void
  ): Promise<EnhancedTemplateMatch[]> {
    try {
      console.log('[EnhancedTemplateMatching] Starting with', availableTemplates.length, 'templates');
      console.log('[EnhancedTemplateMatching] Template details:', availableTemplates.map(t => ({ 
        id: t.id, 
        name: t.name, 
        document_type: t.document_type, 
        field_count: t.field_count,
        status: t.status 
      })));
      
      const startTime = Date.now();
      
      if (onProgress) {
        onProgress(10, 'Preparing enhanced template analysis...');
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (onProgress) {
        onProgress(25, 'Preparing template matching...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (onProgress) {
        onProgress(45, 'Performing template analysis...');
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Use backend template matching directly with available templates
      const result = await this.performBackendTemplateMatching(
        documentData,
        documentName,
        availableTemplates
      );

      if (onProgress) {
        onProgress(70, 'Processing semantic matches...');
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Process results with enhanced matching logic
      const enhancedMatches = await this.processEnhancedResults(result, availableTemplates, documentName);

      if (onProgress) {
        onProgress(90, 'Applying learning algorithms...');
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Apply learning-based adjustments
      const finalMatches = await this.applyLearningAdjustments(enhancedMatches, documentName);

      if (onProgress) {
        onProgress(100, 'Enhanced template matching complete!');
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Log usage for learning
      const processingTime = Date.now() - startTime;
      await this.logTemplateUsages(finalMatches, documentName, result, processingTime);

      return finalMatches;
    } catch (error) {
      console.error('[EnhancedTemplateMatching] Error during enhanced matching:', error);
      throw error;
    }
  }

  /**
   * Perform backend template matching using the analysis service
   */
  private async performBackendTemplateMatching(
    documentData: string,
    documentName: string,
    availableTemplates: Template[]
  ): Promise<AnalysisResult> {
    console.log('[EnhancedTemplateMatching] Calling backend template matching...');
    
    // Use the backend template matching with available templates
    const result = await this.analysisService.matchTemplates(
      documentData,
      documentName,
      availableTemplates
    );
    console.log('[EnhancedTemplateMatching] Backend result:', result);
    
    return result;
  }

  /**
   * Process results with enhanced matching logic
   */
  private async processEnhancedResults(
    result: AnalysisResult,
    availableTemplates: Template[],
    documentName: string
  ): Promise<EnhancedTemplateMatch[]> {
    console.log('[EnhancedTemplateMatching] Processing results:', result);
    console.log('[EnhancedTemplateMatching] Available templates for matching:', availableTemplates.length);
    console.log('[EnhancedTemplateMatching] Result structure:', {
      hasMatches: !!(result as any).matches,
      matchesLength: (result as any).matches?.length || 0,
      hasFields: !!(result as any).fields,
      fieldsLength: (result as any).fields?.length || 0,
      resultKeys: Object.keys(result)
    });
    
    // Check if result is nested in result.result
    const actualResult = (result as any).result || result;
    console.log('[EnhancedTemplateMatching] Actual result structure:', {
      hasMatches: !!(actualResult as any).matches,
      matchesLength: (actualResult as any).matches?.length || 0,
      hasFields: !!(actualResult as any).fields,
      fieldsLength: (actualResult as any).fields?.length || 0,
      actualResultKeys: Object.keys(actualResult)
    });
    
    // If backend provided structured matches, use them
    if (actualResult.matches && Array.isArray(actualResult.matches) && actualResult.matches.length > 0) {
      console.log('[EnhancedTemplateMatching] Found', actualResult.matches.length, 'matches from backend');
    } else {
      // Some backends return matched_template_id/name as fields; synthesize a single match
      try {
        const fields = (actualResult as any).fields as Array<any> | undefined;
        console.log('[EnhancedTemplateMatching] Fields from actualResult:', fields);
        if (fields && Array.isArray(fields) && fields.length > 0) {
          const idField = fields.find(f => (f.label || '').toLowerCase() === 'matched_template_id');
          const nameField = fields.find(f => (f.label || '').toLowerCase() === 'matched_template_name');
          const confidenceField = fields.find(f => (f.label || '').toLowerCase() === 'confidence');
          const matchedId: string | undefined = idField?.value;
          const matchedName: string | undefined = nameField?.value;
          const confidence: number = typeof confidenceField?.value === 'number' ? confidenceField.value : 0.9;

          const normalize = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
          let template = undefined as Template | undefined;
          
          console.log('[EnhancedTemplateMatching] Debug - matchedId:', matchedId, 'matchedName:', matchedName);
          console.log('[EnhancedTemplateMatching] Debug - availableTemplates:', availableTemplates.map(t => ({ id: t.id, name: t.name })));
          
          if (matchedId) {
            const normId = normalize(matchedId);
            console.log('[EnhancedTemplateMatching] Debug - normalized matchedId:', normId);
            template = availableTemplates.find(t => {
              const templateNormId = normalize((t as any).id);
              console.log('[EnhancedTemplateMatching] Debug - comparing:', normId, 'vs', templateNormId);
              return templateNormId === normId;
            });
            console.log('[EnhancedTemplateMatching] Debug - template found by ID:', template?.name);
          }
          if (!template && matchedName) {
            const normName = normalize(matchedName);
            console.log('[EnhancedTemplateMatching] Debug - normalized matchedName:', normName);
            // exact normalized name equality
            template = availableTemplates.find(t => {
              const templateNormName = normalize((t as any).name);
              console.log('[EnhancedTemplateMatching] Debug - comparing names:', normName, 'vs', templateNormName);
              return templateNormName === normName;
            });
            console.log('[EnhancedTemplateMatching] Debug - template found by name (exact):', template?.name);
            // contains either way
            if (!template) {
              template = availableTemplates.find(t => {
                const tn = normalize((t as any).name);
                const contains = tn.includes(normName) || normName.includes(tn);
                console.log('[EnhancedTemplateMatching] Debug - comparing names (contains):', normName, 'vs', tn, '=', contains);
                return contains;
              });
              console.log('[EnhancedTemplateMatching] Debug - template found by name (contains):', template?.name);
            }
          }

          if (template) {
            // Prepare simple label-based overlap metrics
            const extracted = Array.isArray((actualResult as any).fields) ? ((actualResult as any).fields as any[]) : [];
            const normalizeLabel = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
            const extractedLabels = new Set(
              extracted
                .map(f => normalizeLabel((f && (f.label ?? f.name ?? f.id)) || ''))
                .filter(Boolean)
            );
            const templateLabels = (template.fields || []).map((tf: any) => normalizeLabel(tf?.label ?? tf?.name ?? tf?.id));
            const matchedNames: string[] = [];
            let matchedCount = 0;
            for (const raw of templateLabels) {
              if (raw && extractedLabels.has(raw)) {
                matchedCount += 1;
                matchedNames.push(raw);
              }
            }
            const totalTemplateFields = template.field_count ?? (template.fields ? template.fields.length : 0);
            let baseConfidence = totalTemplateFields > 0 ? matchedCount / totalTemplateFields : confidence;
            // If backend did not provide real extracted fields (only meta like matched_template_*),
            // approximate matched count from confidence so UI is informative
            if (matchedCount === 0 && typeof confidence === 'number' && totalTemplateFields > 0) {
              const approx = Math.max(0, Math.min(totalTemplateFields, Math.round(confidence * totalTemplateFields)));
              matchedCount = approx;
              baseConfidence = confidence;
            }
            const synthMatch = {
              id: template.id,
              name: template.name,
              confidence: Math.min(1, Math.max(0, baseConfidence)),
              version: template.version || '1.0',
              documentType: template.document_type || 'General',
              matchedFields: matchedCount,
              totalFields: totalTemplateFields,
              totalExtractedFields: extracted.length,
              matchedFieldNames: matchedNames
            } as any; // will be further enhanced below

            // Attach as matches for downstream processing
            (actualResult as any).matches = [synthMatch];
            console.log('[EnhancedTemplateMatching] Synthesized match from fields:', synthMatch);
          } else {
            console.log('[EnhancedTemplateMatching] Could not map matched template to availableTemplates');
          }
        }
      } catch (e) {
        console.log('[EnhancedTemplateMatching] Synthesis of match failed:', e);
      }
    }

    if (!actualResult.matches || !Array.isArray(actualResult.matches)) {
      console.log('[EnhancedTemplateMatching] No matches found in actualResult after synthesis');
      return [];
    }

    const enhancedMatches: EnhancedTemplateMatch[] = [];

    for (const match of actualResult.matches) {
      console.log('[EnhancedTemplateMatching] Processing match:', match);
      const template = availableTemplates.find(t => t.id === match.id);
      if (!template) {
        console.log('[EnhancedTemplateMatching] Template not found for match:', match.id);
        continue;
      }
      console.log('[EnhancedTemplateMatching] Found template for match:', template.name);

      // Calculate enhanced confidence metrics
      const enhancedMatch = await this.calculateEnhancedMetrics(match, template, actualResult);
      
      // Add improvement suggestions
      enhancedMatch.improvementSuggestions = this.learningService.getImprovementSuggestions(template.id);
      
      enhancedMatches.push(enhancedMatch);
    }

    // Sort by enhanced confidence
    return enhancedMatches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate enhanced metrics for template match
   */
  private async calculateEnhancedMetrics(
    match: TemplateMatch,
    template: Template,
    analysisResult: AnalysisResult
  ): Promise<EnhancedTemplateMatch> {
    // LLM-only: do not alter confidence
    const baseConfidence = match.confidence;
    const semanticMatches = 0;
    const positionMatches = 0;
    const semanticBonus = 0;
    const positionBonus = 0;
    const enhancedConfidence = baseConfidence;

    // Determine extraction quality
    const extractionQuality = this.determineExtractionQuality(enhancedConfidence, semanticMatches, positionMatches);

    return {
      ...match,
      confidence: enhancedConfidence,
      semanticMatches,
      positionMatches,
      confidenceBreakdown: {
        base: baseConfidence,
        semantic_bonus: semanticBonus,
        position_bonus: positionBonus
      },
      extractionQuality,
      improvementSuggestions: []
    };
  }

  /**
   * Calculate semantic matches between extracted fields and template
   */
  private calculateSemanticMatches(
    match: TemplateMatch,
    template: Template,
    analysisResult: AnalysisResult
  ): number {
    if (!analysisResult.fields || !Array.isArray(analysisResult.fields)) {
      return 0;
    }

    let semanticMatches = 0;
    
    // Simple semantic matching based on field labels
    template.fields.forEach(templateField => {
      const matchedField = analysisResult.fields?.find(extractedField => 
        this.isSemanticMatch(extractedField.label, templateField.label)
      );
      
      if (matchedField && matchedField.confidence >= 0.7) {
        semanticMatches++;
      }
    });

    return semanticMatches;
  }

  /**
   * Check if two field labels are semantically similar
   */
  private isSemanticMatch(extractedLabel: string, templateLabel: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedExtracted = normalize(extractedLabel);
    const normalizedTemplate = normalize(templateLabel);

    // Exact match
    if (normalizedExtracted === normalizedTemplate) return true;

    // Contains match
    if (normalizedExtracted.includes(normalizedTemplate) || normalizedTemplate.includes(normalizedExtracted)) {
      return true;
    }

    // Common semantic mappings
    const semanticMappings: Record<string, string[]> = {
      'name': ['fullname', 'completename', 'personname', 'clientname'],
      'address': ['location', 'residence', 'addr'],
      'phone': ['telephone', 'mobile', 'phonenumber', 'contact'],
      'email': ['emailaddress', 'emailid', 'mail'],
      'date': ['dateofbirth', 'dob', 'birthdate', 'registrationdate']
    };

    for (const [key, variants] of Object.entries(semanticMappings)) {
      if (normalizedTemplate.includes(key) && variants.some(variant => normalizedExtracted.includes(variant))) {
        return true;
      }
      if (normalizedExtracted.includes(key) && variants.some(variant => normalizedTemplate.includes(variant))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate position matches based on expected field positions
   */
  private calculatePositionMatches(
    match: TemplateMatch,
    template: Template,
    analysisResult: AnalysisResult
  ): number {
    if (!analysisResult.fields || !Array.isArray(analysisResult.fields)) {
      return 0;
    }

    let positionMatches = 0;
    const positionTolerance = 50; // pixels

    template.fields.forEach(templateField => {
      const matchedField = analysisResult.fields?.find(extractedField => {
        if (!extractedField.position) return false;
        
        const xDiff = Math.abs(extractedField.position.x - templateField.x);
        const yDiff = Math.abs(extractedField.position.y - templateField.y);
        
        return xDiff <= positionTolerance && yDiff <= positionTolerance;
      });
      
      if (matchedField) {
        positionMatches++;
      }
    });

    return positionMatches;
  }

  /**
   * Determine extraction quality based on metrics
   */
  private determineExtractionQuality(
    confidence: number,
    semanticMatches: number,
    positionMatches: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (confidence >= 0.9 && semanticMatches >= positionMatches * 0.8) {
      return 'excellent';
    } else if (confidence >= 0.8 && semanticMatches >= positionMatches * 0.6) {
      return 'good';
    } else if (confidence >= 0.6) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  /**
   * Apply learning-based adjustments to matches
   */
  private async applyLearningAdjustments(
    matches: EnhancedTemplateMatch[],
    documentName: string
  ): Promise<EnhancedTemplateMatch[]> {
    return matches.map(match => {
      // Get adaptive threshold for this template
      const adaptiveThreshold = this.learningService.getAdaptiveConfidenceThreshold(match.id);
      
      // Adjust confidence based on historical performance
      const analytics = this.learningService.getTemplateAnalytics(match.id);
      if (analytics && analytics.usage_count > 5) {
        const performanceAdjustment = (analytics.average_accuracy - 0.8) * 0.1;
        match.confidence = Math.max(0, Math.min(1, match.confidence + performanceAdjustment));
      }

      return {
        ...match,
        adaptiveThreshold
      } as EnhancedTemplateMatch & { adaptiveThreshold: number };
    });
  }

  /**
   * Log template usages for learning
   */
  private async logTemplateUsages(
    matches: EnhancedTemplateMatch[],
    documentName: string,
    analysisResult: AnalysisResult,
    processingTime: number
  ): Promise<void> {
    // Log the best match if available
    if (matches.length > 0) {
      const bestMatch = matches[0];
      await this.learningService.logTemplateUsage(
        bestMatch.id,
        documentName,
        analysisResult,
        processingTime
      );
    }
  }

  /**
   * Get match quality with enhanced criteria
   */
  getEnhancedMatchQuality(match: EnhancedTemplateMatch): { label: string; color: string } {
    switch (match.extractionQuality) {
      case 'excellent':
        return { label: 'Excellent Match', color: 'bg-green-500' };
      case 'good':
        return { label: 'Good Match', color: 'bg-blue-500' };
      case 'fair':
        return { label: 'Fair Match', color: 'bg-yellow-500' };
      case 'poor':
        return { label: 'Poor Match', color: 'bg-red-500' };
      default:
        return { label: 'Unknown Quality', color: 'bg-gray-500' };
    }
  }

  /**
   * Get detailed confidence explanation
   */
  getConfidenceExplanation(match: EnhancedTemplateMatch): string {
    const { base, semantic_bonus, position_bonus } = match.confidenceBreakdown;
    
    return `Base confidence: ${(base * 100).toFixed(1)}% + ` +
           `Semantic bonus: ${(semantic_bonus * 100).toFixed(1)}% + ` +
           `Position bonus: ${(position_bonus * 100).toFixed(1)}% = ` +
           `${(match.confidence * 100).toFixed(1)}% total confidence`;
  }
}