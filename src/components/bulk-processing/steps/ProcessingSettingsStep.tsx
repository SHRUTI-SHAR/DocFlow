/**
 * ProcessingSettingsStep Component
 * Step 2 of the bulk processing wizard - Configure processing options
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { BulkJobConfig } from '@/types/bulk-processing';

interface ProcessingSettingsStepProps {
  initialData?: Partial<BulkJobConfig>;
  onBack: () => void;
  onComplete: (data: Partial<BulkJobConfig>) => void;
}

export const ProcessingSettingsStep: React.FC<ProcessingSettingsStepProps> = ({
  initialData,
  onBack,
  onComplete
}) => {
  const [priority, setPriority] = useState<number>(
    initialData?.processingOptions?.priority || 3
  );
  const [maxRetries, setMaxRetries] = useState<number>(
    initialData?.processingOptions?.maxRetries || 3
  );
  const [enableSignatureDetection, setEnableSignatureDetection] = useState<boolean>(
    initialData?.processingOptions?.enableSignatureDetection || false
  );
  const [parallelWorkers, setParallelWorkers] = useState<number>(
    initialData?.processingOptions?.parallelWorkers || 10
  );
  const [retryDelay, setRetryDelay] = useState<number>(
    initialData?.processingOptions?.retryDelay || 5
  );
  const [exponentialBackoff, setExponentialBackoff] = useState<boolean>(
    initialData?.processingOptions?.exponentialBackoff ?? true
  );
  const [sendToReviewAfterMaxRetries, setSendToReviewAfterMaxRetries] = useState<boolean>(
    initialData?.processingOptions?.sendToReviewAfterMaxRetries ?? true
  );

  const [completionAlerts, setCompletionAlerts] = useState<boolean>(
    initialData?.notifications?.completionAlerts || false
  );
  const [errorAlerts, setErrorAlerts] = useState<boolean>(
    initialData?.notifications?.errorAlerts || false
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customModel, setCustomModel] = useState<string>(
    initialData?.processingOptions?.customModel || ''
  );
  const [processingTimeout, setProcessingTimeout] = useState<number>(
    initialData?.processingOptions?.processingTimeout || 300
  );
  const [enableCostTracking, setEnableCostTracking] = useState<boolean>(
    initialData?.processingOptions?.enableCostTracking || false
  );
  const [enableDetailedLogging, setEnableDetailedLogging] = useState<boolean>(
    initialData?.processingOptions?.enableDetailedLogging || false
  );

  const handleNext = () => {
    onComplete({
      processingOptions: {
        priority,
        maxRetries,
        enableSignatureDetection,
        parallelWorkers,
        retryDelay,
        exponentialBackoff,
        sendToReviewAfterMaxRetries,
        customModel: customModel || undefined,
        processingTimeout,
        enableCostTracking,
        enableDetailedLogging
      },
      notifications: {
        dashboardNotifications: true, // Always enabled
        completionAlerts,
        errorAlerts
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Processing Options</h3>
        <Card>
          <CardHeader>
            <CardTitle>Processing Configuration</CardTitle>
            <CardDescription>
              Configure how documents should be processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="priority">Priority Level</Label>
                <span className="text-sm text-muted-foreground">{priority}/5</span>
              </div>
              <Slider
                id="priority"
                min={1}
                max={5}
                step={1}
                value={[priority]}
                onValueChange={(value) => setPriority(value[0])}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Higher priority jobs are processed first
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-retries">Max Retry Attempts</Label>
              <Input
                id="max-retries"
                type="number"
                min={1}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value) || 3)}
              />
              <p className="text-sm text-muted-foreground">
                Number of times to retry failed documents
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parallel-workers">Parallel Workers</Label>
              <Input
                id="parallel-workers"
                type="number"
                min={1}
                max={50}
                value={parallelWorkers}
                onChange={(e) => setParallelWorkers(parseInt(e.target.value) || 10)}
              />
              <p className="text-sm text-muted-foreground">
                Number of documents to process simultaneously
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="signature-detection">Enable Signature Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Detect and extract signatures from documents
                </p>
              </div>
              <Switch
                id="signature-detection"
                checked={enableSignatureDetection}
                onCheckedChange={setEnableSignatureDetection}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retry-delay">Retry Delay (seconds)</Label>
              <Input
                id="retry-delay"
                type="number"
                min={1}
                max={60}
                value={retryDelay}
                onChange={(e) => setRetryDelay(parseInt(e.target.value) || 5)}
              />
              <p className="text-sm text-muted-foreground">
                Delay between retry attempts
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exponential-backoff">Exponential Backoff</Label>
                <p className="text-sm text-muted-foreground">
                  Increase delay exponentially with each retry
                </p>
              </div>
              <Switch
                id="exponential-backoff"
                checked={exponentialBackoff}
                onCheckedChange={setExponentialBackoff}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="send-to-review">Send to Review Queue</Label>
                <p className="text-sm text-muted-foreground">
                  Send failed documents to manual review after max retries
                </p>
              </div>
              <Switch
                id="send-to-review"
                checked={sendToReviewAfterMaxRetries}
                onCheckedChange={setSendToReviewAfterMaxRetries}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Notification Preferences</h3>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure when you want to be notified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dashboard Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Always enabled - see updates in the dashboard
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="completion-alerts">Completion Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when processing completes
                </p>
              </div>
              <Switch
                id="completion-alerts"
                checked={completionAlerts}
                onCheckedChange={setCompletionAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="error-alerts">Error Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when errors occur
                </p>
              </div>
              <Switch
                id="error-alerts"
                checked={errorAlerts}
                onCheckedChange={setErrorAlerts}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-accent">
          <span className="font-semibold">Advanced Settings</span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-model">Custom Extraction Model</Label>
                <Input
                  id="custom-model"
                  placeholder="Leave empty for default model"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="processing-timeout">Processing Timeout (seconds)</Label>
                <Input
                  id="processing-timeout"
                  type="number"
                  min={60}
                  max={3600}
                  value={processingTimeout}
                  onChange={(e) => setProcessingTimeout(parseInt(e.target.value) || 300)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cost-tracking">Enable Cost Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track LLM API costs for this job
                  </p>
                </div>
                <Switch
                  id="cost-tracking"
                  checked={enableCostTracking}
                  onCheckedChange={setEnableCostTracking}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="detailed-logging">Enable Detailed Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate detailed logs for debugging
                  </p>
                </div>
                <Switch
                  id="detailed-logging"
                  checked={enableDetailedLogging}
                  onCheckedChange={setEnableDetailedLogging}
                />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} size="lg">
          Next: Review & Start
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

