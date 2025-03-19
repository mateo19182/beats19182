'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { FileCard } from '@/components/FileCard';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Music, Tag as TagIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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

function TagPageContent() {
  const params = useParams();
  const tagName = decodeURIComponent(params.name as string);
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch files with the specific tag
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('tag', tagName);
        
        const response = await fetch(`/api/files?${params.toString()}`);
        
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

    if (tagName) {
      fetchFiles();
    }
  }, [tagName, toast]);

  const handleFileDeleted = (deletedFileId: string) => {
    // Remove the deleted file from the state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedFileId));
  };

  return (
    <div className="container mx-auto py-8 pb-28 sm:pb-24">
      <div className="flex flex-col space-y-4 mb-6">
        <div>
          <Link href="/tags" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to all tags
          </Link>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <TagIcon className="h-6 w-6" />
                Tag: {tagName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Browsing {files.length} {files.length === 1 ? 'file' : 'files'} with this tag
              </p>
            </div>
            
            <Link 
              href="/upload" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Upload Files
            </Link>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading files with tag "{tagName}"...</p>
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
          <h2 className="text-xl font-semibold mb-2">No files with this tag</h2>
          <p className="text-muted-foreground mb-4">
            There are no files tagged with "{tagName}". Try adding this tag to some of your files or upload new files with this tag.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/upload" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Upload Files
            </Link>
            <Link 
              href="/tags" 
              className="inline-block px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md"
            >
              Browse Other Tags
            </Link>
          </div>
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
      
      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </div>
  );
}

export default function TagPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 pb-28 sm:pb-24">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <TagPageContent />
    </Suspense>
  );
} 