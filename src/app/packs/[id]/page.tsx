'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Music, 
  Link as LinkIcon, 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { FileCard } from '@/components/FileCard';
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function PackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const packId = params.id as string;
  
  // Pack state
  const [pack, setPack] = useState<Pack | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Files state
  const [allFiles, setAllFiles] = useState<File[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, [debouncedSearchQuery]);
  
  // Fetch pack details
  const fetchPack = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/packs/${packId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pack');
      }
      
      const { pack } = await response.json();
      setPack(pack);
      setName(pack.name);
      setDescription(pack.description || '');
      setSelectedFileIds(new Set(pack.files.map((file: File) => file.id)));
    } catch (error) {
      console.error('Error fetching pack:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load pack',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch all files with search and pagination
  const fetchAllFiles = async () => {
    try {
      setIsLoadingFiles(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.itemsPerPage.toString());
      
      const response = await fetch(`/api/files?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      setAllFiles(data.files);
      
      // Update pagination info
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        itemsPerPage: data.pagination.itemsPerPage
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load files',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    Promise.all([fetchPack()]);
  }, [packId]);

  // Fetch files when search or pagination parameters change
  useEffect(() => {
    fetchAllFiles();
  }, [debouncedSearchQuery, pagination.currentPage, pagination.itemsPerPage]);
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1 // Reset to first page when changing items per page
    }));
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };
  
  // Save pack changes
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Pack name is required',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/packs/${packId}`, {
        method: 'PATCH',
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
        throw new Error(errorData.error || 'Failed to update pack');
      }
      
      const { pack: updatedPack } = await response.json();
      setPack(updatedPack);
      
      toast({
        title: 'Pack updated',
        description: 'Your pack has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating pack:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update pack',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    const updatedSelection = new Set(selectedFileIds);
    
    if (updatedSelection.has(fileId)) {
      updatedSelection.delete(fileId);
    } else {
      updatedSelection.add(fileId);
    }
    
    setSelectedFileIds(updatedSelection);
  };
  
  // Copy share link to clipboard
  const copyShareLink = () => {
    if (!pack) return;
    
    const shareUrl = `${window.location.origin}/shared/${pack.shareLink}`;
    navigator.clipboard.writeText(shareUrl);
    
    toast({
      title: 'Share link copied',
      description: 'The share link has been copied to your clipboard.',
    });
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading pack...</p>
        </div>
      </div>
    );
  }
  
  if (error || !pack) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          <p>{error || 'Failed to load pack'}</p>
        </div>
        <Button 
          className="mt-4"
          variant="outline"
          onClick={() => router.push('/packs')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Packs
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center mb-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/packs')}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Pack</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        {/* Left column - Pack details */}
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
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
              <p className="text-sm font-medium">Share Link</p>
              <div className="flex items-center">
                <Input
                  value={`${window.location.origin}/shared/${pack.shareLink}`}
                  readOnly
                  className="flex-grow"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={copyShareLink}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with others to give them access to this pack without authentication.
              </p>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </Card>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Files in this Pack</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''} selected
            </p>
            
            {pack.files.length === 0 ? (
              <div className="bg-muted/50 p-4 rounded-md text-center">
                <p className="text-muted-foreground">No files in this pack yet.</p>
                <p className="text-sm mt-2">Select files from the right panel to add them to this pack.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {pack.files.map((file) => (
                  <div key={file.id} className="flex items-center p-2 border rounded-md hover:bg-muted/50">
                    <Music className="h-4 w-4 mr-2 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium" title={file.name}>{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right column - All files */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Files</h2>
            
            {/* Search input */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search files..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : allFiles.length === 0 ? (
            <div className="bg-muted/50 p-4 rounded-md text-center">
              <p className="text-muted-foreground">
                {debouncedSearchQuery 
                  ? "No files match your search query." 
                  : "You don't have any audio files yet."}
              </p>
              {!debouncedSearchQuery && (
                <Button
                  className="mt-4"
                  onClick={() => router.push('/upload')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              )}
              {debouncedSearchQuery && (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {allFiles.map((file) => (
                  <div key={file.id} className="border rounded-lg p-3">
                    <div className="flex items-center">
                      <Checkbox
                        id={`file-${file.id}`}
                        checked={selectedFileIds.has(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        className="mr-3"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`file-${file.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {file.name}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                          {file.tags.length > 0 && (
                            <span className="ml-2">
                              Tags: {file.tags.map(tag => tag.name).join(', ')}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        {selectedFileIds.has(file.id) ? 'Remove' : 'Add'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} files
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex items-center mx-2">
                        {/* Simplified page indicator for mobile */}
                        <span className="text-sm mx-2">
                          {pagination.currentPage} / {pagination.totalPages}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </div>
  );
}