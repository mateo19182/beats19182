'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Music, PlayCircle, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { playAudio, AudioFile } from '@/components/GlobalAudioPlayer';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';

interface Tag {
  id: string;
  name: string;
}

interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  tags: Tag[];
}

interface Pack {
  id: string;
  name: string;
  description: string | null;
  shareLink: string;
  createdAt: string;
  files: File[];
}

export default function SharedPackPage() {
  const params = useParams();
  const shareLink = params.shareLink as string;
  
  const [pack, setPack] = useState<Pack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch the shared pack
  useEffect(() => {
    const fetchSharedPack = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/shared/${shareLink}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch shared pack');
        }
        
        const { pack } = await response.json();
        setPack(pack);
      } catch (error) {
        console.error('Error fetching shared pack:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSharedPack();
  }, [shareLink]);
  
  // Handle play audio
  const handlePlay = (file: File) => {
    const audioFile: AudioFile = {
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      createdAt: new Date(file.createdAt),
    };
    playAudio(audioFile);
  };
  
  // Handle download
  const handleDownload = (fileId: string) => {
    window.open(`/api/files/${fileId}`, '_blank');
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading shared pack...</p>
        </div>
      </div>
    );
  }
  
  if (error || !pack) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Pack Not Found</h1>
          <div className="bg-destructive/10 text-destructive p-4 rounded-md inline-block">
            <p>This shared pack does not exist or is no longer available.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">{pack.name}</CardTitle>
            <CardDescription>
              Shared pack • {formatDistanceToNow(new Date(pack.createdAt), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pack.description && (
              <p className="text-muted-foreground mb-4">{pack.description}</p>
            )}
            <div className="flex items-center">
              <Music className="h-5 w-5 mr-2 text-primary" />
              <span>{pack.files.length} audio file{pack.files.length !== 1 ? 's' : ''}</span>
            </div>
          </CardContent>
        </Card>
        
        {pack.files.length === 0 ? (
          <div className="bg-muted/50 p-8 rounded-md text-center">
            <p className="text-muted-foreground">This pack does not contain any files.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pack.files.map((file) => (
              <div key={file.id} className="border rounded-lg overflow-hidden bg-card">
                <div className="p-4 flex items-center space-x-4">
                  <div className="bg-primary/10 rounded-md p-2 flex-shrink-0">
                    <Music className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate" title={file.name}>{file.name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                      <span>{file.name.split('.').pop()?.toUpperCase()}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
                    </div>
                    
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags.map((tag) => (
                          <span 
                            key={tag.id} 
                            className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePlay(file)}
                      title="Play"
                    >
                      <PlayCircle className="h-5 w-5" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file.id)}
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </div>
  );
} 