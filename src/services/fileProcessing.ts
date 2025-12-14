import type { DocumentData } from "@/types/document";

export class FileProcessingService {
  private static instance: FileProcessingService;

  static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  async processFile(file: File): Promise<DocumentData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        try {
          const base64Data = reader.result as string;
          
          const documentData: DocumentData = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            size: file.size,
            base64Data,
            uploadedAt: new Date()
          };

          resolve(documentData);
        } catch (error) {
          reject(new Error('Failed to process file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not supported. Please upload PDF or image files.' };
    }

    return { isValid: true };
  }

  getFileTypeIcon(type: string): string {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    return '📋';
  }
}