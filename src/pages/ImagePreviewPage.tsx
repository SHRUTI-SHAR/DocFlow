import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Upload, FileText } from 'lucide-react';
import PreviewImagesButton from '../components/PreviewImagesButton';
import { useToast } from '../hooks/use-toast';

const ImagePreviewPage: React.FC = () => {
  const [documentData, setDocumentData] = useState<string>('');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Only PDF files are supported for image preview.",
        variant: "destructive",
      });
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setDocumentData(result);
      toast({
        title: "File Loaded",
        description: `${file.name} has been loaded successfully.`,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">PDF to Image Preview</h1>
        <p className="text-muted-foreground">
          Upload a PDF to see the converted images that are sent to the LLM
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">Select PDF File</Label>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
          </div>

          {documentData && (
            <div className="space-y-2">
              <Label>Document Status</Label>
              <div className="flex items-center gap-2 text-green-600">
                <FileText className="h-4 w-4" />
                <span className="text-sm">PDF loaded successfully</span>
              </div>
            </div>
          )}

                 <div className="flex justify-center">
                   <PreviewImagesButton
                     documentData={documentData}
                     convertedImages={[]} // No converted images for standalone upload
                     disabled={!documentData}
                     size="default"
                     className="min-w-[200px]"
                   />
                 </div>
                 
                 <div className="text-center text-sm text-muted-foreground mt-2">
                   <p>Note: This page only works with documents that have been processed through the main workflow.</p>
                   <p>The "View Images" button will be enabled after document processing is complete.</p>
                 </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImagePreviewPage;
