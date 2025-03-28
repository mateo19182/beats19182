'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { FileCard } from '@/components/FileCard';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Music, Tag as TagIcon, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

// Define the pagination information interface
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

function TagPageContent() {
  const params = useParams();
  const tagName = decodeURIComponent(params.name as string);
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Check for page parameter in URL on mount
  useEffect(() => {
    // Check for page parameter in URL
    const pageParam = new URLSearchParams(window.location.search).get('page');
    if (pageParam && !isNaN(Number(pageParam))) {
      setPagination(prev => ({
        ...prev,
        currentPage: Number(pageParam)
      }));
    }
  }, []);

  // Fetch files with the specific tag
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('tag', tagName);
        params.append('page', pagination.currentPage.toString());
        params.append('limit', pagination.itemsPerPage.toString());
        
        const response = await fetch(`/api/files?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch files');
        }
        
        const data = await response.json();
        setFiles(data.files);
        
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

    if (tagName) {
      fetchFiles();
    }
  }, [tagName, toast, pagination.currentPage, pagination.itemsPerPage]);

  const handleFileDeleted = (deletedFileId: string) => {
    // Remove the deleted file from the state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== deletedFileId));
    
    // Refetch to ensure pagination is correct
    const fetchFiles = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append('tag', tagName);
        params.append('page', pagination.currentPage.toString());
        params.append('limit', pagination.itemsPerPage.toString());
        
        const response = await fetch(`/api/files?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch files');
        }
        
        const data = await response.json();
        setFiles(data.files);
        
        // Update pagination info
        setPagination({
          currentPage: data.pagination.currentPage,
          totalPages: data.pagination.totalPages,
          totalItems: data.pagination.totalItems,
          itemsPerPage: data.pagination.itemsPerPage
        });
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };
    
    fetchFiles();
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
                Browsing {pagination.totalItems} {pagination.totalItems === 1 ? 'file' : 'files'} with this tag
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
                onDelete={() => handleFileDeleted(file.id)}
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