'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Play, Download, Music, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@prisma/client';
import { playAudio, AudioFile } from '@/components/GlobalAudioPlayer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';

interface FileCardProps {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  tags: Tag[];
  onDelete?: () => void;
  allowAddToPack?: boolean;
}

export function FileCard({ id, name, type, size, createdAt, tags, onDelete, allowAddToPack = true }: FileCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [packs, setPacks] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);
  const [showAddToPackMenu, setShowAddToPackMenu] = useState(false);
  
  // Fetch user packs when dropdown is opened
  useEffect(() => {
    if (showAddToPackMenu && allowAddToPack) {
      fetchUserPacks();
    }
  }, [showAddToPackMenu, allowAddToPack]);
  
  // Fetch user packs for dropdown
  const fetchUserPacks = async () => {
    try {
      setIsLoadingPacks(true);
      
      const response = await fetch('/api/packs');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch packs');
      }
      
      const data = await response.json();
      setPacks(data.packs.map((pack: any) => ({ id: pack.id, name: pack.name })));
    } catch (error) {
      console.error('Error fetching packs:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load packs',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPacks(false);
    }
  };
  
  const handlePlay = () => {
    const audioFile: AudioFile = {
      id,
      name,
      type,
      size,
      createdAt,
    };
    playAudio(audioFile);
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
  
  // Add file to pack
  const handleAddToPack = async (packId: string) => {
    try {
      // Get current pack
      const packResponse = await fetch(`/api/packs/${packId}`);
      
      if (!packResponse.ok) {
        const errorData = await packResponse.json();
        throw new Error(errorData.error || 'Failed to fetch pack');
      }
      
      const { pack } = await packResponse.json();
      
      // Check if file is already in the pack
      const fileExists = pack.files.some((file: any) => file.id === id);
      
      if (fileExists) {
        toast({
          title: 'File already in pack',
          description: 'This file is already in the selected pack.',
        });
        return;
      }
      
      // Add file to pack
      const fileIds = [...pack.files.map((file: any) => file.id), id];
      
      const updateResponse = await fetch(`/api/packs/${packId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds,
        }),
      });
      
      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to add file to pack');
      }
      
      toast({
        title: 'File added to pack',
        description: `The file has been added to "${pack.name}".`,
      });
      
      // Close the dropdown
      setShowAddToPackMenu(false);
    } catch (error) {
      console.error('Error adding file to pack:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add file to pack',
        variant: 'destructive',
      });
    }
  };
  
  // Create new pack with this file
  const handleCreateNewPack = () => {
    // Create a new URL with file ID in the search parameters
    const url = new URL('/packs/new', window.location.origin);
    url.searchParams.append('fileId', id);
    
    // Navigate to the new pack page
    window.location.href = url.toString();
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
            onClick={handlePlay}
            title="Play"
          >
            <Play className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-5 w-5" />
          </Button>
          
          {allowAddToPack && (
            <DropdownMenu open={showAddToPackMenu} onOpenChange={setShowAddToPackMenu}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Add to Pack"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Add to Pack</DropdownMenuLabel>
                
                {isLoadingPacks ? (
                  <DropdownMenuItem disabled>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading packs...
                  </DropdownMenuItem>
                ) : packs.length === 0 ? (
                  <DropdownMenuItem disabled>No packs available</DropdownMenuItem>
                ) : (
                  packs.map((pack) => (
                    <DropdownMenuItem 
                      key={pack.id} 
                      onClick={() => handleAddToPack(pack.id)}
                    >
                      <Music className="h-4 w-4 mr-2" />
                      {pack.name}
                    </DropdownMenuItem>
                  ))
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateNewPack}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Pack
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
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
    </div>
  );
} 