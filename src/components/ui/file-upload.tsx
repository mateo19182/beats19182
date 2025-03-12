import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean; // Add disabled prop
}

export function FileUpload({
  onUpload,
  multiple = false,
  accept = 'audio/*',
  maxSize = 100, // Default 100MB
  disabled = false, // Default to not disabled
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      validateAndSetFiles(fileList);
    }
  };

  const validateAndSetFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the maximum size of ${maxSize}MB`,
          variant: 'destructive',
        });
        return false;
      }

      // Check file type if accept is specified
      if (accept && !file.type.match(accept.replace('*', '.*'))) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a valid audio file`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      if (multiple) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      } else {
        setSelectedFiles(validFiles.slice(0, 1));
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Don't allow drag if disabled
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Don't process if disabled
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return; // Don't allow drop if disabled
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);
      validateAndSetFiles(fileList);
    }
  };

  const removeFile = (index: number) => {
    if (disabled) return; // Don't allow removal if disabled
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (disabled) return; // Don't allow upload if disabled
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      // Clear selected files after upload
      setSelectedFiles([]);
    } else {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-semibold">Drag & drop files here</h3>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse your files
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Maximum file size: {maxSize}MB
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          <ul className="border rounded-md divide-y">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2">
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || disabled}
        className="w-full"
      >
        Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
      </Button>
    </div>
  );
} 