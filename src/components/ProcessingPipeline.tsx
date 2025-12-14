import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  FormInput, 
  Users, 
  Download,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

interface PipelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  duration?: string;
}

interface ProcessingPipelineProps {
  steps?: PipelineStep[];
  isProcessing?: boolean;
  stats?: {
    fieldsDetected: number;
    ocrConfidence: number;
    formSections: number;
    validationRules: number;
  };
}

export const ProcessingPipeline = ({ 
  steps = [], 
  isProcessing = false,
  stats 
}: ProcessingPipelineProps) => {

  const getStatusIcon = (status: PipelineStep['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-secondary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PipelineStep['status']) => {
    const variants = {
      complete: 'default',
      processing: 'secondary',
      error: 'destructive',
      pending: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className={`capitalize ${status === 'complete' ? 'bg-success text-success-foreground' : ''}`}>
        {status}
      </Badge>
    );
  };

  const overallProgress = steps.length > 0 
    ? Math.round(steps.reduce((acc, step) => acc + step.progress, 0) / steps.length)
    : 0;

  if (steps.length === 0 && !isProcessing) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Processing Pipeline</h2>
          <p className="text-muted-foreground text-lg mb-6">
            Real-time monitoring of your document transformation process
          </p>
          {steps.length > 0 && (
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          )}
        </div>

        {steps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <Card 
                key={step.id} 
                className={`p-6 transition-smooth hover:shadow-medium ${
                  step.status === 'processing' ? 'shadow-glow border-primary/30' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-card rounded-xl shadow-soft">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    {getStatusBadge(step.status)}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {step.description}
                </p>
                
                {step.status !== 'pending' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{Math.round(step.progress)}%</span>
                        {step.duration && (
                          <span className="text-muted-foreground">({step.duration})</span>
                        )}
                      </div>
                    </div>
                    <Progress value={step.progress} className="h-2" />
                  </div>
                )}
                
                {step.status === 'pending' && (
                  <div className="text-sm text-muted-foreground">
                    Waiting for previous step to complete...
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Live Processing Stats - Only show if stats are provided */}
        {stats && (
          <Card className="mt-8 p-6 bg-gradient-card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary mb-1">{stats.fieldsDetected}</div>
                <div className="text-sm text-muted-foreground">Fields Detected</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary mb-1">{stats.ocrConfidence.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">OCR Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success mb-1">{stats.formSections}</div>
                <div className="text-sm text-muted-foreground">Form Sections</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning mb-1">{stats.validationRules}</div>
                <div className="text-sm text-muted-foreground">Validation Rules</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
};