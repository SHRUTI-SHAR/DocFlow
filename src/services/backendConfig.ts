/**
 * Backend Configuration Service
 * Manages backend selection and configuration based on environment variables
 */

export type BackendType = 'fastapi' | 'supabase';

export interface BackendConfig {
  type: BackendType;
  fastApiUrl: string;
  supabaseUrl: string;
  bulkApiUrl: string;
}

class BackendConfigService {
  private static instance: BackendConfigService;
  private config: BackendConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): BackendConfigService {
    if (!BackendConfigService.instance) {
      BackendConfigService.instance = new BackendConfigService();
    }
    return BackendConfigService.instance;
  }

  private loadConfig(): BackendConfig {
    const backendType = (import.meta.env.VITE_DOCUMENT_ANALYSIS_BACKEND || 'fastapi') as BackendType;
    const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || 'http://mo8cgscwgs0o4ssw84ssokkw.52.172.152.242.sslip.io/';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nvdkgfptnqardtxlqoym.supabase.co';
    const bulkApiUrl = import.meta.env.VITE_BULK_API_URL;
    if (!bulkApiUrl) throw new Error('VITE_BULK_API_URL is required');

    console.log('[BackendConfig] Loaded configuration:', {
      backendType,
      fastApiUrl,
      supabaseUrl,
      bulkApiUrl
    });

    return {
      type: backendType,
      fastApiUrl,
      supabaseUrl,
      bulkApiUrl
    };
  }

  getConfig(): BackendConfig {
    return this.config;
  }

  getBackendType(): BackendType {
    return this.config.type;
  }

  isFastAPI(): boolean {
    return this.config.type === 'fastapi';
  }

  isSupabase(): boolean {
    return this.config.type === 'supabase';
  }

  getFastApiUrl(): string {
    return this.config.fastApiUrl;
  }

  getSupabaseUrl(): string {
    return this.config.supabaseUrl;
  }

  getBulkApiUrl(): string {
    return this.config.bulkApiUrl;
  }

  // Method to switch backend type at runtime (useful for testing)
  setBackendType(type: BackendType): void {
    this.config.type = type;
    console.log(`[BackendConfig] Switched to ${type} backend`);
  }
}

export const backendConfig = BackendConfigService.getInstance();
