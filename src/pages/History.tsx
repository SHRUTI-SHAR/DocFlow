import React from 'react';
import { ProcessingHistory } from '@/components/ProcessingHistory';

const History: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Processing History</h1>
          <p className="text-muted-foreground">
            View all your document processing requests with detailed status and results
          </p>
        </div>
        <ProcessingHistory />
      </div>
    </div>
  );
};

export default History;