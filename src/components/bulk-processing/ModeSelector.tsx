/**
 * ModeSelector Component
 * Clean, simple mode selection between single document and bulk processing
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Layers, ArrowRight } from 'lucide-react';
import { ProcessingMode } from '@/types/bulk-processing';

interface ModeSelectorProps {
  onModeSelect: (mode: ProcessingMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ onModeSelect }) => {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Document Processing</h1>
          <p className="text-muted-foreground text-lg">
            Choose how you want to process your documents
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Single Document */}
          <Card 
            className="group cursor-pointer border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-200"
            onClick={() => onModeSelect('single')}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                
                {/* Title */}
                <h2 className="text-xl font-semibold mb-3">Single Document</h2>
                
                {/* Description */}
                <p className="text-muted-foreground text-sm mb-5">
                  Process one document at a time with full control and immediate results.
                </p>
                
                {/* Features */}
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left w-full">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Upload and process immediately
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Real-time progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Template selection and matching
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Instant data extraction
                  </li>
                </ul>
                
                {/* Button */}
                <Button className="w-full" size="lg">
                  Select Single Document
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Processing */}
          <Card 
            className="group cursor-pointer border-2 border-transparent hover:border-primary/50 hover:shadow-lg transition-all duration-200"
            onClick={() => onModeSelect('bulk')}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                
                {/* Title */}
                <h2 className="text-xl font-semibold mb-3">Bulk Processing</h2>
                
                {/* Description */}
                <p className="text-muted-foreground text-sm mb-5">
                  Process multiple documents automatically from folders, databases, or cloud storage.
                </p>
                
                {/* Features */}
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left w-full">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Automated batch processing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Scheduled processing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Progress monitoring dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Manual review queue for errors
                  </li>
                </ul>
                
                {/* Button */}
                <Button className="w-full" size="lg">
                  Select Bulk Processing
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

