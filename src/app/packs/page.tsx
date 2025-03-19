'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Music, Plus, Share2, Pencil, Trash2, Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface Pack {
  id: string;
  name: string;
  description: string | null;
  shareLink: string;
  createdAt: string;
  files: File[];
}

export default function PacksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Create pack state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackDescription, setNewPackDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Fetch all packs for the current user
  const fetchPacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/packs');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch packs');
      }
      
      const data = await response.json();
      setPacks(data.packs);
    } catch (error) {
      console.error('Error fetching packs:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load packs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load packs on component mount
  useEffect(() => {
    fetchPacks();
  }, []);
  
  // Create a new pack
  const handleCreatePack = async () => {
    if (!newPackName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Pack name is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsCreating(true);
      
      const response = await fetch('/api/packs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPackName,
          description: newPackDescription,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pack');
      }
      
      const { pack } = await response.json();
      
      // Add the new pack to the state
      setPacks((prevPacks) => [pack, ...prevPacks]);
      
      // Close the dialog and reset form
      setShowCreateDialog(false);
      setNewPackName('');
      setNewPackDescription('');
      
      toast({
        title: 'Pack created',
        description: 'Your new pack has been created successfully.',
      });
      
      // Navigate to the pack edit page
      router.push(`/packs/${pack.id}`);
    } catch (error) {
      console.error('Error creating pack:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create pack',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  // Delete a pack
  const handleDeletePack = async (id: string) => {
    if (confirm('Are you sure you want to delete this pack? This action cannot be undone.')) {
      try {
        setIsDeleting(id);
        
        const response = await fetch(`/api/packs/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete pack');
        }
        
        // Remove the deleted pack from the state
        setPacks((prevPacks) => prevPacks.filter(pack => pack.id !== id));
        
        toast({
          title: 'Pack deleted',
          description: 'The pack has been deleted successfully.',
        });
      } catch (error) {
        console.error('Error deleting pack:', error);
        
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete pack',
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };
  
  // Copy share link to clipboard
  const copyShareLink = (shareLink: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareLink}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: 'Share link copied',
      description: 'The share link has been copied to your clipboard.',
    });
  };
  
  // Format file size
  const formatFileSize = (count: number): string => {
    if (count === 0) return 'No files';
    if (count === 1) return '1 file';
    return `${count} files`;
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Your Packs</h1>
        
        <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Create New Pack
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your packs...</p>
        </div>
      ) : error ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : packs.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <div className="bg-primary/10 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No packs yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first pack to organize and share your audio files.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>Create Your First Pack</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <Card key={pack.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="truncate">{pack.name}</CardTitle>
                <CardDescription>
                  {formatDistanceToNow(new Date(pack.createdAt), { addSuffix: true })} • {formatFileSize(pack.files.length)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {pack.description || 'No description provided.'}
                </p>
                
                {pack.files.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Files:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
                      {pack.files.slice(0, 5).map((file) => (
                        <li key={file.id} className="truncate flex items-center">
                          <Music className="h-3 w-3 mr-2 inline" />
                          {file.name}
                        </li>
                      ))}
                      {pack.files.length > 5 && (
                        <li className="text-xs text-muted-foreground mt-1">
                          +{pack.files.length - 5} more files
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/packs/${pack.id}`)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyShareLink(pack.shareLink)}
                  >
                    <Link className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeletePack(pack.id)}
                  disabled={isDeleting === pack.id}
                >
                  {isDeleting === pack.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Pack Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pack</DialogTitle>
            <DialogDescription>
              Create a new pack to organize and share your audio files.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Pack Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                placeholder="My Awesome Pack"
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Add a description for your pack..."
                value={newPackDescription}
                onChange={(e) => setNewPackDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePack}
              disabled={isCreating || !newPackName.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Pack'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 