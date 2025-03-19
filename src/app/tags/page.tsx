'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag as TagIcon, Search, Loader2, FileAudio, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

// Define tag type
interface Tag {
  id: string;
  name: string;
  fileCount: number;
}

function TagsPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'popular' | 'az' | 'za'>('popular');
  
  useEffect(() => {
    fetchTags();
  }, []);
  
  const fetchTags = async (search?: string) => {
    try {
      setLoading(true);
      
      const queryParams = new URLSearchParams();
      if (search) {
        queryParams.append('search', search);
      }
      
      const url = `/api/tags${search ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch tags');
      }
      
      const data = await response.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load tags',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTags(searchQuery);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchTags(searchQuery);
    }
  };
  
  const handleClearSearch = () => {
    setSearchQuery('');
    fetchTags();
  };
  
  const sortTags = (tags: Tag[]): Tag[] => {
    if (sortOption === 'az') {
      return [...tags].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === 'za') {
      return [...tags].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // 'popular' - already sorted by fileCount from API
      return tags;
    }
  };
  
  const handleTagClick = (tagName: string) => {
    router.push(`/tags/${encodeURIComponent(tagName)}`);
  };
  
  const sortedTags = sortTags(tags);
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Tags</h1>
      <p className="text-muted-foreground mb-6">
        Browse all your tags or search for specific ones
      </p>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search input */}
        <div className="flex-1">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1.5 h-7 w-7 px-0"
                onClick={handleClearSearch}
              >
                ×
              </Button>
            )}
          </form>
        </div>
        
        {/* Sort options */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <div className="flex">
            <Button
              size="sm"
              variant={sortOption === 'popular' ? 'default' : 'outline'}
              className="rounded-r-none"
              onClick={() => setSortOption('popular')}
            >
              Popular
            </Button>
            <Button
              size="sm"
              variant={sortOption === 'az' ? 'default' : 'outline'}
              className="rounded-none border-x-0"
              onClick={() => setSortOption('az')}
            >
              A-Z
            </Button>
            <Button
              size="sm"
              variant={sortOption === 'za' ? 'default' : 'outline'}
              className="rounded-l-none"
              onClick={() => setSortOption('za')}
            >
              Z-A
            </Button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : sortedTags.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="inline-flex bg-muted rounded-full p-4">
            <TagIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No tags found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {searchQuery 
              ? `No tags matching "${searchQuery}" were found. Try a different search term.` 
              : "You haven't created any tags yet. Add tags to your files to organize them better."}
          </p>
          <Button asChild className="mt-4">
            <Link href="/upload">Upload Files & Add Tags</Link>
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Tags ({sortedTags.length})</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedTags.map((tag) => (
              <div 
                key={tag.id}
                onClick={() => handleTagClick(tag.name)}
                className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="px-2 flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    <span className="font-medium">{tag.name}</span>
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileAudio className="h-3.5 w-3.5 mr-1.5" />
                  <span>{tag.fileCount} {tag.fileCount === 1 ? 'file' : 'files'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TagsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-2">Tags</h1>
        <p className="text-muted-foreground mb-6">
          Browse all your tags or search for specific ones
        </p>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    }>
      <TagsPageContent />
    </Suspense>
  );
} 