'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileCard } from '@/components/FileCard';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Music, Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  imagePath?: string;
  tags: Array<{
    id: string;
    name: string;
  }>;
}

interface Tag {
  id: string;
  name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Create a component that uses searchParams
function FilesPageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('random');
  const [sortOrder, setSortOrder] = useState('desc');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Check for tag parameter in URL on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      setSelectedTag(tagParam);
    }
    
    // Check for page parameter in URL
    const pageParam = searchParams.get('page');
    if (pageParam && !isNaN(Number(pageParam))) {
      setPagination(prev => ({
        ...prev,
        currentPage: Number(pageParam)
      }));
    }
  }, [searchParams]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder]);

  // Fetch files with search, filter, sort, and pagination parameters
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
      params.append('page', pagination.currentPage.toString());
      params.append('limit', pagination.itemsPerPage.toString());
      
      const response = await fetch(`/api/files?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
      setAllTags(data.tags);
      
      // Update pagination info
      setPagination({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        itemsPerPage: data.pagination.itemsPerPage
      });
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

  // Fetch files when search, filter, sort, or pagination parameters change
  useEffect(() => {
    fetchFiles();
  }, [debouncedSearchQuery, selectedTag, sortBy, sortOrder, pagination.currentPage, pagination.itemsPerPage]);

  const handleFileDeleted = (deletedFileId: string) => {
    // Remove the deleted file from the state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedFileId));
    
    // Refetch to ensure pagination is correct
    fetchFiles();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTag('all');
    setSortBy('random');
    setSortOrder('desc');
  };

  const getSortLabel = (field: string, order: string) => {
    const fieldLabels: Record<string, string> = {
      'createdAt': 'Date',
      'name': 'Name',
      'size': 'Size',
      'type': 'Type',
      'random': 'Random'
    };
    
    if (field === 'random') {
      return 'Random';
    }
    
    return `${fieldLabels[field] || field} (${order === 'asc' ? 'A-Z' : 'Z-A'})`;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
    
    // Update URL with new page parameter without full page reload
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url.toString());
  };
  
  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1 // Reset to first page when changing items per page
    }));
  };

  const hasActiveFilters = debouncedSearchQuery || selectedTag !== 'all' || sortBy !== 'random' || sortOrder !== 'desc';

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
              <DropdownMenuItem onClick={() => { setSortBy('random'); setSortOrder('desc'); }}>
                Random
              </DropdownMenuItem>
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
            {(sortBy !== 'random' || sortOrder !== 'desc') && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Sort: {getSortLabel(sortBy, sortOrder)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 ml-1" 
                  onClick={() => { setSortBy('random'); setSortOrder('desc'); }}
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
        <>
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
                imagePath={file.imagePath}
                onDelete={() => handleFileDeleted(file.id)}
                allowAddToPack={true}
              />
            ))}
          </div>
          
          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((pagination.currentPage - 1) * pagination.itemsPerPage + 1, pagination.totalItems)} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} files
              </div>
              
              <div className="flex items-center gap-2">
                <Select
                  value={pagination.itemsPerPage.toString()}
                  onValueChange={handleItemsPerPageChange}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 per page</SelectItem>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="20">20 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              
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
                    <span className="text-sm mx-2 sm:hidden">
                      {pagination.currentPage} / {pagination.totalPages}
                    </span>
                    
                    {/* Page number buttons for desktop */}
                    <div className="hidden sm:flex items-center">
                      {/* Always show first page */}
                      {pagination.totalPages > 3 && pagination.currentPage > 2 && (
                        <>
                          <Button
                            variant={pagination.currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 mx-1"
                            onClick={() => handlePageChange(1)}
                          >
                            1
                          </Button>
                          {pagination.currentPage > 3 && <span className="mx-1">...</span>}
                        </>
                      )}
                      
                      {/* Show current page and surrounding pages */}
                      {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        
                        if (pagination.totalPages <= 3) {
                          // If 3 or fewer total pages, show all of them
                          pageNum = i + 1;
                        } else if (pagination.currentPage === 1) {
                          // If on first page, show pages 1-3
                          pageNum = i + 1;
                        } else if (pagination.currentPage === pagination.totalPages) {
                          // If on last page, show last 3 pages
                          pageNum = pagination.totalPages - 2 + i;
                        } else {
                          // Otherwise, show current page and adjacent pages
                          pageNum = pagination.currentPage - 1 + i;
                        }
                        
                        // Skip if page number is out of range
                        if (pageNum < 1 || pageNum > pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pagination.currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 mx-1"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {/* Always show last page */}
                      {pagination.totalPages > 3 && pagination.currentPage < pagination.totalPages - 1 && (
                        <>
                          {pagination.currentPage < pagination.totalPages - 2 && <span className="mx-1">...</span>}
                          <Button
                            variant={pagination.currentPage === pagination.totalPages ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 mx-1"
                            onClick={() => handlePageChange(pagination.totalPages)}
                          >
                            {pagination.totalPages}
                          </Button>
                        </>
                      )}
                    </div>
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