import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  FileText, 
  CreditCard,
  FileCheck,
  Receipt,
  Briefcase,
  Award,
  User,
  File,
  ChevronRight
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

interface DocumentTypeBucket {
  type: string;
  display_name: string;
  count: number;
  total_size: number;
  icon?: string;
  color?: string;
}

interface DocumentTypeBucketsProps {
  onTypeSelect: (type: string) => void;
  selectedType: string;
  refreshTrigger?: number;
}

const iconMap: { [key: string]: React.ReactNode } = {
  'pan-card': <CreditCard className="w-4 h-4" />,
  'aadhaar-card': <CreditCard className="w-4 h-4" />,
  'passport': <Award className="w-4 h-4" />,
  'bank-statement': <Receipt className="w-4 h-4" />,
  'invoice': <Receipt className="w-4 h-4" />,
  'salary-slip': <Briefcase className="w-4 h-4" />,
  'form-16': <FileCheck className="w-4 h-4" />,
  'unknown': <File className="w-4 h-4" />,
};

const colorMap: { [key: string]: string } = {
  'pan-card': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'aadhaar-card': 'bg-green-500/10 text-green-600 border-green-500/20',
  'passport': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'bank-statement': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'invoice': 'bg-red-500/10 text-red-600 border-red-500/20',
  'salary-slip': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'form-16': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'unknown': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export const DocumentTypeBuckets: React.FC<DocumentTypeBucketsProps> = ({
  onTypeSelect,
  selectedType,
  refreshTrigger
}) => {
  const [buckets, setBuckets] = useState<DocumentTypeBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBuckets();
  }, [refreshTrigger]);

  const fetchBuckets = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/documents/${user.user.id}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch document buckets');
        setBuckets([]);
        return;
      }

      const data = await response.json();
      setBuckets(data.document_types || []);
      
    } catch (error) {
      console.error('Error fetching buckets:', error);
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
        <div className="h-12 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No document types yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload documents to create type-based folders
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* All Documents */}
      <Button
        variant={selectedType === 'all' ? 'default' : 'ghost'}
        className="w-full justify-start"
        onClick={() => onTypeSelect('all')}
      >
        <Folder className="w-4 h-4 mr-2" />
        <span className="flex-1 text-left">All Documents</span>
        <Badge variant="secondary" className="ml-2">
          {buckets.reduce((sum, b) => sum + b.count, 0)}
        </Badge>
      </Button>

      {/* Document Type Buckets */}
      {buckets.map((bucket) => {
        const isSelected = selectedType === bucket.type;
        const icon = iconMap[bucket.type] || iconMap['unknown'];
        const colorClass = colorMap[bucket.type] || colorMap['unknown'];
        
        return (
          <Button
            key={bucket.type}
            variant={isSelected ? 'default' : 'ghost'}
            className={`w-full justify-start ${!isSelected && colorClass}`}
            onClick={() => onTypeSelect(bucket.type)}
          >
            <div className="flex items-center gap-2 flex-1">
              {icon}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{bucket.display_name}</p>
                <p className="text-xs opacity-70">{formatSize(bucket.total_size)}</p>
              </div>
            </div>
            <Badge variant="secondary" className="ml-2">
              {bucket.count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
};
