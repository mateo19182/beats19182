'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileCard } from '@/components/FileCard';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Music, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// Define the File type
interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  currentVersion: number;
  tags: Array<{
    id: string;
    name: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
}

// Create a component that uses searchParams
function FilesPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Check for tag parameter in URL on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    }
  }, [searchParams]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch files with search, filter, and sort parameters
  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
      if (selectedTag && selectedTag !== 'all') params.append('tag', selectedTag);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      const response = await fetch(`/api/files?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
      setAllTags(data.tags);
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

  // Fetch files when search, filter, or sort parameters change
  useEffect(() => {
    fetchFiles();
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder]);

  const handleFileDeleted = (deletedFileId: string) => {
    // Remove the deleted file from the state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedFileId));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const getSortLabel = (field: string, order: string) => {
    const fieldLabels: Record<string, string> = {
      'createdAt': 'Date',
      'name': 'Name',
      'size': 'Size',
      'type': 'Type'
    };
    
    return `${fieldLabels[field] || field} (${order === 'asc' ? 'A-Z' : 'Z-A'})`;
  };

  const hasActiveFilters = debouncedSearchQuery || selectedTag !== 'all' || sortBy !== 'createdAt' || sortOrder !== 'desc';

  return (
    <div className="container mx-auto py-8 pb-28 sm:pb-24">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Files</h1>
          <a 
            href="/upload" 
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Upload Files
          </a>
        </div>
        
        {/* Search and filter bar */}
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files by name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.name}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Sort: {getSortLabel(sortBy, sortOrder)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('desc'); }}>
                Date (Newest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('createdAt'); setSortOrder('asc'); }}>
                Date (Oldest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>
                Name (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('size'); setSortOrder('desc'); }}>
                Size (Largest first)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortBy('size'); setSortOrder('asc'); }}>
                Size (Smallest first)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
        
        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2">
            {debouncedSearchQuery && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: {debouncedSearchQuery}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedTag && selectedTag !== 'all' && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Tag: {selectedTag}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => setSelectedTag('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {(sortBy !== 'createdAt' || sortOrder !== 'desc') && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Sort: {getSortLabel(sortBy, sortOrder)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => { setSortBy('createdAt'); setSortOrder('desc'); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
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
          <h2 className="text-xl font-semibold mb-2">
            {hasActiveFilters ? 'No matching files found' : 'No files yet'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your search filters to find what you\'re looking for.'
              : 'Upload your first audio file to get started.'}
          </p>
          {hasActiveFilters ? (
            <Button onClick={clearFilters}>Clear Filters</Button>
          ) : (
            <a 
              href="/upload" 
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Upload Files
            </a>
          )}
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
              currentVersion={file.currentVersion}
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

// Wrap with Suspense in the default export
export default function FilesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 pb-28 sm:pb-24">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your files...</p>
        </div>
      </div>
    }>
      <FilesPageContent />
    </Suspense>
  );
} 