'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Music, 
  Save, 
  ArrowLeft, 
  X
} from 'lucide-react';
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

// Component that uses searchParams
function NewPackFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const fileId = searchParams.get('fileId');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Pre-selected file state
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [preselectedFile, setPreselectedFile] = useState<File | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(fileId ? true : false);
  
  // Fetch the pre-selected file if fileId is provided
  useEffect(() => {
    if (fileId) {
      fetchFile(fileId);
    }
  }, [fileId]);
  
  // Fetch a file by ID
  const fetchFile = async (id: string) => {
    try {
      setIsLoadingFile(true);
      
      const response = await fetch(`/api/files/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file');
      }
      
      const { file } = await response.json();
      setPreselectedFile(file);
      setSelectedFileIds(new Set([id]));
    } catch (error) {
      console.error('Error fetching file:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load file',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFile(false);
    }
  };
  
  // Create a new pack
  const handleCreatePack = async () => {
    if (!name.trim()) {
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
          name,
          description,
          fileIds: Array.from(selectedFileIds),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create pack');
      }
      
      const { pack } = await response.json();
      
      toast({
        title: 'Pack created',
        description: 'Your new pack has been created successfully.',
      });
      
      // Navigate to the pack detail page
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
  
  // Remove file from selection
  const removeFile = () => {
    setSelectedFileIds(new Set());
    setPreselectedFile(null);
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  return (
    <>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/packs')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Pack</h1>
      </div>
      
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Pack Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="My Awesome Pack"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Add a description for your pack..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Initial File
            </label>
            
            {isLoadingFile ? (
              <div className="flex items-center justify-center py-8 border rounded-md bg-muted/20">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : preselectedFile ? (
              <div className="border rounded-md p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{preselectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(preselectedFile.size)} • {formatDistanceToNow(new Date(preselectedFile.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border rounded-md bg-muted/20">
                <p className="text-muted-foreground mb-2">No file selected</p>
                <p className="text-xs text-muted-foreground">
                  You can add files after creating the pack.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/packs')}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePack}
              disabled={isCreating || !name.trim()}
              className="min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Pack
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Wrapper component with suspense
function NewPackForm() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <NewPackFormContent />
    </Suspense>
  );
}

// Main layout
export default function NewPackPage() {
  return (
    <div className="container mx-auto py-8">
      <NewPackForm />
    </div>
  );
} 