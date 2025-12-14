import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Plus, Sparkles, Zap } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface FormCreationMethodSelectorProps {
  onMethodSelect: (method: 'template' | 'upload' | 'scratch') => void;
  templatesCount: number;
  templatesLoading: boolean;
  isUploading: boolean;
}

export const FormCreationMethodSelector = ({
  onMethodSelect,
  templatesCount,
  templatesLoading,
  isUploading,
}: FormCreationMethodSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Use Template */}
      <Card
        className="group cursor-pointer border-2 border-border hover:border-primary transition-smooth bg-gradient-card"
        onClick={() => onMethodSelect('template')}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-smooth">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Use Template</CardTitle>
          <CardDescription>Start with a pre-built template with predefined fields and layouts</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            {templatesLoading ? (
              <>
                <div className="text-2xl font-bold text-primary mb-1 animate-pulse">...</div>
                <div className="text-sm text-muted-foreground">Loading...</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-primary mb-1">{templatesCount}</div>
                <div className="text-sm text-muted-foreground">Available Templates</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Document */}
      <Card
        className={`group cursor-pointer border-2 border-border hover:border-secondary transition-smooth bg-gradient-card ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !isUploading && onMethodSelect('upload')}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-smooth">
            {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-8 w-8 text-secondary" />}
          </div>
          <CardTitle className="text-xl">{isUploading ? 'Processing...' : 'Upload Document'}</CardTitle>
          <CardDescription>Upload a PDF or image and automatically extract form fields using AI</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-secondary mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
            <div className="text-sm text-muted-foreground">Automatic Field Detection</div>
          </div>
        </CardContent>
      </Card>

      {/* Start from Scratch */}
      <Card
        className="group cursor-pointer border-2 border-border hover:border-success transition-smooth bg-gradient-card"
        onClick={() => onMethodSelect('scratch')}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 group-hover:bg-success/20 transition-smooth">
            <Plus className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-xl">Start from Scratch</CardTitle>
          <CardDescription>Create a custom form by adding and configuring fields manually</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Full Control</span>
            </div>
            <div className="text-sm text-muted-foreground">Custom Design</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

