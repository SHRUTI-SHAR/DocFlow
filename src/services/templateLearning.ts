import type { TemplateMatch } from "@/types/document";
import type { Template } from "@/hooks/useTemplateManager";

export interface TemplateUsageLog {
  id: string;
  template_id: string;
  document_name: string;
  extraction_accuracy: number;
  field_accuracies: FieldAccuracy[];
  user_feedback?: 'positive' | 'negative' | 'neutral';
  correction_count: number;
  timestamp: string;
  processing_time_ms: number;
}

export interface FieldAccuracy {
  field_id: string;
  field_label: string;
  extracted_correctly: boolean;
  confidence_score: number;
  user_corrected: boolean;
}

export interface TemplateAnalytics {
  template_id: string;
  usage_count: number;
  average_accuracy: number;
  field_performance: Record<string, FieldPerformance>;
  common_extraction_errors: ExtractionError[];
  improvement_suggestions: string[];
  trending_accuracy: number[]; // Last 10 usage scores
}

export interface FieldPerformance {
  field_id: string;
  field_label: string;
  success_rate: number;
  average_confidence: number;
  common_errors: string[];
  improvement_trend: 'improving' | 'declining' | 'stable';
}

export interface ExtractionError {
  error_type: 'missing_field' | 'incorrect_value' | 'low_confidence' | 'format_error';
  field_label: string;
  frequency: number;
  suggested_fix: string;
}

export class TemplateLearningService {
  private static instance: TemplateLearningService;
  private readonly STORAGE_KEY = 'template_usage_logs';
  private readonly ANALYTICS_KEY = 'template_analytics';

  static getInstance(): TemplateLearningService {
    if (!TemplateLearningService.instance) {
      TemplateLearningService.instance = new TemplateLearningService();
    }
    return TemplateLearningService.instance;
  }

  /**
   * Log template usage with extraction results
   */
  async logTemplateUsage(
    templateId: string,
    documentName: string,
    extractionResults: any,
    processingTimeMs: number,
    userFeedback?: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    try {
      const log: TemplateUsageLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        template_id: templateId,
        document_name: documentName,
        extraction_accuracy: this.calculateExtractionAccuracy(extractionResults),
        field_accuracies: this.analyzeFieldAccuracies(extractionResults),
        user_feedback: userFeedback,
        correction_count: this.countUserCorrections(extractionResults),
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTimeMs
      };

      // Store usage log
      const existingLogs = this.loadUsageLogs();
      existingLogs.push(log);
      
      // Keep only last 1000 logs to prevent storage bloat
      if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
      }
      
      this.saveUsageLogs(existingLogs);

      // Update analytics
      await this.updateTemplateAnalytics(templateId, log);
    } catch (error) {
      console.error('[TemplateLearning] Failed to log template usage:', error);
    }
  }

  /**
   * Get analytics for a specific template
   */
  getTemplateAnalytics(templateId: string): TemplateAnalytics | null {
    try {
      const analytics = this.loadAnalytics();
      return analytics[templateId] || null;
    } catch (error) {
      console.error('[TemplateLearning] Failed to get template analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics for all templates
   */
  getAllTemplateAnalytics(): Record<string, TemplateAnalytics> {
    try {
      return this.loadAnalytics();
    } catch (error) {
      console.error('[TemplateLearning] Failed to get all analytics:', error);
      return {};
    }
  }

  /**
   * Get improvement suggestions for a template
   */
  getImprovementSuggestions(templateId: string): string[] {
    const analytics = this.getTemplateAnalytics(templateId);
    if (!analytics) return [];

    const suggestions: string[] = [];

    // Low accuracy suggestions
    if (analytics.average_accuracy < 0.8) {
      suggestions.push("Consider reviewing field labels for better semantic matching");
      suggestions.push("Add more specific field validation rules");
    }

    // Field-specific suggestions
    Object.values(analytics.field_performance).forEach(fieldPerf => {
      if (fieldPerf.success_rate < 0.7) {
        suggestions.push(`Field "${fieldPerf.field_label}" has low success rate - consider improving position hints or examples`);
      }
      
      if (fieldPerf.average_confidence < 0.6) {
        suggestions.push(`Field "${fieldPerf.field_label}" has low confidence - add more validation rules or examples`);
      }
    });

    // Common error suggestions
    analytics.common_extraction_errors.forEach(error => {
      if (error.frequency > 3) {
        suggestions.push(error.suggested_fix);
      }
    });

    return suggestions;
  }

  /**
   * Get adaptive confidence threshold based on template performance
   */
  getAdaptiveConfidenceThreshold(templateId: string): number {
    const analytics = this.getTemplateAnalytics(templateId);
    if (!analytics) return 0.5; // Default threshold

    const baseThreshold = 0.5;
    const performanceAdjustment = (analytics.average_accuracy - 0.8) * 0.2;
    
    // Adjust threshold based on recent performance
    const recentTrend = this.calculateTrend(analytics.trending_accuracy);
    const trendAdjustment = recentTrend * 0.1;

    return Math.max(0.3, Math.min(0.8, baseThreshold + performanceAdjustment + trendAdjustment));
  }

  /**
   * Record user feedback on extraction results
   */
  async recordUserFeedback(
    templateId: string,
    documentName: string,
    feedback: 'positive' | 'negative' | 'neutral',
    fieldCorrections?: Record<string, any>
  ): Promise<void> {
    try {
      // Find the most recent log for this template and document
      const logs = this.loadUsageLogs();
      const recentLog = logs
        .filter(log => log.template_id === templateId && log.document_name === documentName)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      if (recentLog) {
        recentLog.user_feedback = feedback;
        if (fieldCorrections) {
          recentLog.correction_count = Object.keys(fieldCorrections).length;
          // Update field accuracies based on corrections
          recentLog.field_accuracies.forEach(fieldAcc => {
            if (fieldCorrections[fieldAcc.field_id]) {
              fieldAcc.user_corrected = true;
              fieldAcc.extracted_correctly = false;
            }
          });
        }
        this.saveUsageLogs(logs);
        
        // Update analytics with feedback
        await this.updateTemplateAnalytics(templateId, recentLog);
      }
    } catch (error) {
      console.error('[TemplateLearning] Failed to record user feedback:', error);
    }
  }

  /**
   * Calculate extraction accuracy from results
   */
  private calculateExtractionAccuracy(extractionResults: any): number {
    if (!extractionResults?.fields || !Array.isArray(extractionResults.fields)) {
      return 0;
    }

    const totalFields = extractionResults.fields.length;
    const highConfidenceFields = extractionResults.fields.filter((field: any) => 
      field.confidence && field.confidence >= 0.8
    ).length;

    return totalFields > 0 ? (highConfidenceFields / totalFields) : 0;
  }

  /**
   * Analyze field-level accuracies
   */
  private analyzeFieldAccuracies(extractionResults: any): FieldAccuracy[] {
    if (!extractionResults?.fields || !Array.isArray(extractionResults.fields)) {
      return [];
    }

    return extractionResults.fields.map((field: any) => ({
      field_id: field.id || field.label,
      field_label: field.label,
      extracted_correctly: field.confidence >= 0.7,
      confidence_score: field.confidence || 0,
      user_corrected: false // Will be updated with user feedback
    }));
  }

  /**
   * Count user corrections in extraction results
   */
  private countUserCorrections(extractionResults: any): number {
    // This would be implemented when user correction data is available
    return 0;
  }

  /**
   * Update template analytics with new usage data
   */
  private async updateTemplateAnalytics(templateId: string, log: TemplateUsageLog): Promise<void> {
    const analytics = this.loadAnalytics();
    
    if (!analytics[templateId]) {
      analytics[templateId] = {
        template_id: templateId,
        usage_count: 0,
        average_accuracy: 0,
        field_performance: {},
        common_extraction_errors: [],
        improvement_suggestions: [],
        trending_accuracy: []
      };
    }

    const templateAnalytics = analytics[templateId];
    
    // Update usage count
    templateAnalytics.usage_count++;
    
    // Update average accuracy
    templateAnalytics.average_accuracy = (
      (templateAnalytics.average_accuracy * (templateAnalytics.usage_count - 1)) + 
      log.extraction_accuracy
    ) / templateAnalytics.usage_count;
    
    // Update trending accuracy (keep last 10)
    templateAnalytics.trending_accuracy.push(log.extraction_accuracy);
    if (templateAnalytics.trending_accuracy.length > 10) {
      templateAnalytics.trending_accuracy.shift();
    }
    
    // Update field performance
    log.field_accuracies.forEach(fieldAcc => {
      if (!templateAnalytics.field_performance[fieldAcc.field_id]) {
        templateAnalytics.field_performance[fieldAcc.field_id] = {
          field_id: fieldAcc.field_id,
          field_label: fieldAcc.field_label,
          success_rate: 0,
          average_confidence: 0,
          common_errors: [],
          improvement_trend: 'stable'
        };
      }
      
      const fieldPerf = templateAnalytics.field_performance[fieldAcc.field_id];
      
      // Update success rate
      const previousSuccesses = fieldPerf.success_rate * (templateAnalytics.usage_count - 1);
      const newSuccesses = previousSuccesses + (fieldAcc.extracted_correctly ? 1 : 0);
      fieldPerf.success_rate = newSuccesses / templateAnalytics.usage_count;
      
      // Update average confidence
      const previousConfidence = fieldPerf.average_confidence * (templateAnalytics.usage_count - 1);
      fieldPerf.average_confidence = (previousConfidence + fieldAcc.confidence_score) / templateAnalytics.usage_count;
    });
    
    // Update improvement suggestions
    templateAnalytics.improvement_suggestions = this.generateImprovementSuggestions(templateAnalytics);
    
    this.saveAnalytics(analytics);
  }

  /**
   * Generate improvement suggestions based on analytics
   */
  private generateImprovementSuggestions(analytics: TemplateAnalytics): string[] {
    const suggestions: string[] = [];
    
    if (analytics.average_accuracy < 0.7) {
      suggestions.push("Consider adding more specific field examples for better extraction");
    }
    
    if (analytics.usage_count > 10 && analytics.average_accuracy < 0.8) {
      suggestions.push("Review field positioning and labels for better semantic matching");
    }
    
    return suggestions;
  }

  /**
   * Calculate trend from array of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    
    return recent - older;
  }

  /**
   * Load usage logs from storage
   */
  private loadUsageLogs(): TemplateUsageLog[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('[TemplateLearning] Failed to load usage logs:', error);
      return [];
    }
  }

  /**
   * Save usage logs to storage
   */
  private saveUsageLogs(logs: TemplateUsageLog[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.warn('[TemplateLearning] Failed to save usage logs:', error);
    }
  }

  /**
   * Load analytics from storage
   */
  private loadAnalytics(): Record<string, TemplateAnalytics> {
    try {
      const data = localStorage.getItem(this.ANALYTICS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('[TemplateLearning] Failed to load analytics:', error);
      return {};
    }
  }

  /**
   * Save analytics to storage
   */
  private saveAnalytics(analytics: Record<string, TemplateAnalytics>): void {
    try {
      localStorage.setItem(this.ANALYTICS_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.warn('[TemplateLearning] Failed to save analytics:', error);
    }
  }
}
