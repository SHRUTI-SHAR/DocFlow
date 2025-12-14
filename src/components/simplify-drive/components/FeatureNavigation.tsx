import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronRight } from 'lucide-react';
import { FEATURE_TABS, type FeatureTab } from '../constants/featureTabs';
import { cn } from '@/lib/utils';

interface FeatureNavigationProps {
  activeFeature: string;
  onFeatureChange: (featureId: string) => void;
}

export function FeatureNavigation({ activeFeature, onFeatureChange }: FeatureNavigationProps) {
  const activeTab = FEATURE_TABS.find(t => t.id === activeFeature);

  return (
    <div className="border-b bg-card/50 sticky top-0 z-40">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 p-2 min-w-max">
          {FEATURE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFeature === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onFeatureChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      
      {/* Breadcrumb */}
      {activeTab && activeFeature !== 'documents' && (
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2 text-sm">
          <button 
            onClick={() => onFeatureChange('documents')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            SimplifyDrive
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium flex items-center gap-2">
            <activeTab.icon className="h-4 w-4" />
            {activeTab.label}
          </span>
        </div>
      )}
    </div>
  );
}
