import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface WorkflowDashboardProps {
  document?: any;
}

export const WorkflowDashboard = ({ document }: WorkflowDashboardProps) => {
  // Only show if we have a processed document
  if (!document) {
    return null;
  }

  // For now, show empty state since we don't have real workflow data yet
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Workflow Dashboard</h2>
          <p className="text-muted-foreground text-lg">
            Track document processing, approvals, and team collaboration
          </p>
        </div>

        <Card className="p-12">
          <div className="text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Workflow Ready</h3>
            <p className="text-muted-foreground">
              Document "{document.filename}" is ready for workflow processing.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};