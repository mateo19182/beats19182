'use client';

import { useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Play, Pause, Download, Music, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@prisma/client';

interface FileCardProps {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  tags: Tag[];
  onDelete?: () => void;
}

export function FileCard({ id, name, type, size, createdAt, tags, onDelete }: FileCardProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleDownload = () => {
    window.open(`/api/files/${id}`, '_blank');
  };
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        
        const response = await fetch(`/api/files/${id}/delete`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete file');
        }
        
        toast({
          title: 'File deleted',
          description: 'The file has been deleted successfully.',
        });
        
        // Call the onDelete callback if provided
        if (onDelete) {
          onDelete();
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete file',
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  // Get file extension
  const fileExtension = name.split('.').pop()?.toUpperCase() || '';
  
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="p-4 flex items-center space-x-4">
        <div className="bg-primary/10 rounded-md p-3 flex-shrink-0">
          <Music className="h-8 w-8 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" title={name}>{name}</h3>
          <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
            <span>{fileExtension}</span>
            <span>•</span>
            <span>{formatFileSize(size)}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
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
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <audio 
        ref={audioRef} 
        src={`/api/files/${id}`} 
        onEnded={() => setIsPlaying(false)}
        className="w-full"
        controls
      />
    </div>
  );
} 