/**
 * BulkProcessingHub Component
 * Clean, simple hub for bulk processing options
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import type { BulkStatistics } from '@/types/bulk-processing';

interface BulkProcessingHubProps {
  onNavigateToDashboard: () => void;
  onNavigateToReviewQueue: () => void;
  onNavigateToCreateJob: () => void;
  onNavigateToSettings?: () => void;
  onBack: () => void;
  statistics?: BulkStatistics;
}

export const BulkProcessingHub: React.FC<BulkProcessingHubProps> = ({
  onNavigateToDashboard,
  onNavigateToReviewQueue,
  onNavigateToCreateJob,
  onBack,
  statistics
}) => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Mode Selection
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Bulk Processing</h1>
          <p className="text-muted-foreground text-lg">
            Choose what you want to do
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dashboard */}
          <Card
            className="group cursor-pointer border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-200"
            onClick={onNavigateToDashboard}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-7 w-7 text-primary" />
                </div>
                
                {/* Title */}
                <h2 className="text-lg font-semibold mb-3">Dashboard</h2>
                
                {/* Description */}
                <p className="text-muted-foreground text-sm mb-5">
                  View and manage all your bulk processing jobs, monitor progress, and check statistics.
                </p>
                
                {/* Features */}
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left w-full">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    View active jobs
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Monitor real-time progress
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Check processing statistics
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Manage job operations
                  </li>
                </ul>
                
                {/* Button */}
                <Button className="w-full" size="lg">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Review Queue */}
          <Card
            className="group cursor-pointer border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-200"
            onClick={onNavigateToReviewQueue}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <ClipboardList className="h-7 w-7 text-primary" />
                </div>
                
                {/* Title */}
                <h2 className="text-lg font-semibold mb-3">Review Queue</h2>
                
                {/* Description */}
                <p className="text-muted-foreground text-sm mb-5">
                  Review and manage documents that failed processing, retry them, or mark as resolved.
                </p>
                
                {/* Features */}
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left w-full">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    View failed documents
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Retry processing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Review error details
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Bulk actions support
                  </li>
                </ul>

                {/* Badge for pending reviews */}
                {statistics && statistics.documentsInReviewQueue > 0 && (
                  <Badge variant="destructive" className="mb-4">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {statistics.documentsInReviewQueue} need review
                  </Badge>
                )}
                
                {/* Button */}
                <Button className="w-full" size="lg">
                  View Review Queue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Create New Job */}
          <Card
            className="group cursor-pointer border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-200"
            onClick={onNavigateToCreateJob}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-7 w-7 text-primary" />
                </div>
                
                {/* Title */}
                <h2 className="text-lg font-semibold mb-3">Create New Job</h2>
                
                {/* Description */}
                <p className="text-muted-foreground text-sm mb-5">
                  Set up a new bulk processing job with source configuration, schedule, and processing options.
                </p>
                
                {/* Features */}
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left w-full">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Configure source (folder/database/cloud)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Set processing schedule
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Define processing options
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Start automated processing
                  </li>
                </ul>
                
                {/* Button */}
                <Button className="w-full" size="lg">
                  Create New Job
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

