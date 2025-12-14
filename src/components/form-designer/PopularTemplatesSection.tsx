import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template } from '@/hooks/useTemplateManager';

interface PopularTemplatesSectionProps {
  templates: Template[];
  isLoading: boolean;
  onTemplateSelect: (template: Template) => void;
}

export const PopularTemplatesSection = ({ templates, isLoading, onTemplateSelect }: PopularTemplatesSectionProps) => {
  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6">Popular Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-6">Popular Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.slice(0, 3).map((template) => (
          <Card
            key={template.id}
            className="group cursor-pointer hover:shadow-medium transition-smooth"
            onClick={() => onTemplateSelect(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base group-hover:text-primary transition-smooth">{template.name}</CardTitle>
                  <CardDescription className="text-sm mt-1">{template.document_type}</CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">{template.field_count} fields</div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

