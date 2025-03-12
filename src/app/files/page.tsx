'use client';

import { useState, useEffect } from 'react';
import { FileCard } from '@/components/FileCard';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Music } from 'lucide-react';

// Define the File type
interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  tags: Array<{
    id: string;
    name: string;
  }>;
}

export default function FilesPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/files');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load files',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [toast]);

  const handleFileDeleted = (deletedFileId: string) => {
    // Remove the deleted file from the state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedFileId));
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Audio Files</h1>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your files...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : files.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <div className="bg-primary/10 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No files yet</h2>
          <p className="text-muted-foreground mb-4">
            Upload your first audio file to get started.
          </p>
          <a 
            href="/upload" 
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Upload Files
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          {files.map((file) => (
            <FileCard
              key={file.id}
              id={file.id}
              name={file.name}
              type={file.type}
              size={file.size}
              createdAt={new Date(file.createdAt)}
              tags={file.tags}
              onDelete={() => handleFileDeleted(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 