'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Play, Download, Music, Trash2, Plus, Edit, Tag as TagIcon, Check, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@prisma/client';
import { playAudio, AudioFile } from '@/components/GlobalAudioPlayer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2 } from 'lucide-react';
import { TagsInput } from '@/components/TagsInput';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FileVersion {
  id: string;
  version: number;
  path: string;
  size: number;
  createdAt: string;
}

interface FileCardProps {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  tags: Tag[];
  currentVersion: number;
  imagePath?: string;
  onDelete?: () => void;
  allowAddToPack?: boolean;
}

// Add a utility function to generate deterministic colors from a string (file ID)
const generateColors = (str: string) => {
  // Simple hash function to get a number from a string
  const hash = str.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Generate primary color (hue between 0-360)
  const h1 = Math.abs(hash % 360);
  // Generate secondary color (complementary - 180 degrees apart)
  const h2 = (h1 + 180) % 360;
  
  return {
    color1: `hsl(${h1}, 80%, 65%)`,
    color2: `hsl(${h2}, 80%, 65%)`,
    angle: Math.abs((hash * 137) % 360) // Using golden angle (137.5°) for variety
  };
};

// Generate a CSS background property for placeholder
const generatePlaceholderBackground = (fileId: string) => {
  const { color1, color2, angle } = generateColors(fileId);
  return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
};

export function FileCard({ id, name, type, size, createdAt, tags, currentVersion, imagePath, onDelete, allowAddToPack = true }: FileCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [packs, setPacks] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingPacks, setIsLoadingPacks] = useState(false);
  const [showAddToPackMenu, setShowAddToPackMenu] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [currentTags, setCurrentTags] = useState<string[]>(tags.map(tag => tag.name));
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number>(currentVersion);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(imagePath || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Fetch file versions
  useEffect(() => {
    fetchFileVersions();
  }, [id]);

  const fetchFileVersions = async () => {
    try {
      setIsLoadingVersions(true);
      const response = await fetch(`/api/files/${id}?metadata=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file versions');
      }
      
      const data = await response.json();
      setVersions(data.file.versions);
    } catch (error) {
      console.error('Error fetching file versions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file versions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingVersions(false);
    }
  };
  
  const handlePlay = () => {
    const audioFile: AudioFile = {
      id,
      name,
      type,
      size,
      createdAt,
      version: selectedVersion,
    } as AudioFile;
    playAudio(audioFile);
  };
  
  const handleDownload = () => {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = `/api/files/${id}`;
    link.download = name; // Set the download attribute with the file name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  
  // Handle saving tags
  const handleSaveTags = async () => {
    try {
      setIsSavingTags(true);
      
      const response = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: currentTags,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tags');
      }
      
      const data = await response.json();
      
      // Update the local tags
      if (onDelete) {
        // If onDelete is provided, we need to refresh the parent component
        onDelete();
      }
      
      setIsEditingTags(false);
      
      toast({
        title: 'Tags updated',
        description: 'The file tags have been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating tags:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update tags',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTags(false);
    }
  };
  
  // Cancel tag editing
  const handleCancelEditTags = () => {
    // Reset to original tags
    setCurrentTags(tags.map(tag => tag.name));
    setIsEditingTags(false);
  };
  
  // Handle tag click
  const handleTagClick = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation(); // Prevent parent div click handler
    router.push(`/tags/${encodeURIComponent(tagName)}`);
  };
  
  // Fetch all available tags for suggestion when editing mode is activated
  useEffect(() => {
    if (isEditingTags) {
      fetchAllTags();
    }
  }, [isEditingTags]);
  
  // Fetch all tags from the API
  const fetchAllTags = async () => {
    try {
      setIsLoadingTags(true);
      
      const response = await fetch('/api/tags');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tags');
      }
      
      const data = await response.json();
      // Extract tag names from the response and filter out tags that are already applied
      const existingTagNames = currentTags;
      const availableTags = data.tags
        .map((tag: Tag) => tag.name)
        .filter((name: string) => !existingTagNames.includes(name));
      
      setSuggestedTags(availableTags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load tags for suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTags(false);
    }
  };
  
  // Handle saving file name
  const handleSaveName = async () => {
    if (!currentName.trim()) {
      toast({
        title: 'Error',
        description: 'File name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSavingName(true);
      
      const response = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: currentName,
          tags: currentTags,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update file name');
      }
      
      // Update the file in parent component
      if (onDelete) {
        // If onDelete is provided, we need to refresh the parent component
        onDelete();
      }
      
      setIsEditingName(false);
      
      toast({
        title: 'File renamed',
        description: 'The file has been renamed successfully.',
      });
    } catch (error) {
      console.error('Error updating file name:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to rename file',
        variant: 'destructive',
      });
    } finally {
      setIsSavingName(false);
    }
  };
  
  // Cancel name editing
  const handleCancelEditName = () => {
    setCurrentName(name);
    setIsEditingName(false);
  };
  
  // Start editing name
  const handleStartEditName = () => {
    // Don't allow editing name while editing tags
    if (isEditingTags) return;
    
    setCurrentName(name);
    setIsEditingName(true);
  };
  
  // Handle key press in name input
  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };
  
  // Handle image upload
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };
  
  // Add this near the other useEffect hooks
  useEffect(() => {
    if (imagePath) {
      console.log(`Setting up image for file ${id}: ${imagePath}`);
      // Set image with cache busting to prevent stale images
      setImagePreview(`${imagePath}?t=${Date.now()}`);
    } else {
      console.log(`No image path for file ${id}`);
      setImagePreview(null);
    }
  }, [imagePath, id]);
  
  // Update the handleImageChange function to improve image preview
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image size should be less than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploadingImage(true);
      
      // Show a local preview immediately
      const localPreviewUrl = URL.createObjectURL(file);
      setImagePreview(localPreviewUrl);
      
      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload image
      console.log(`Uploading image for file ${id}`);
      const response = await fetch(`/api/files/${id}/image`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      console.log(`Upload successful, new image path: ${data.imagePath}`);
      
      // Update image preview with the server path and cache buster
      const serverImagePath = `${data.imagePath}?t=${Date.now()}`;
      setImagePreview(serverImagePath);
      
      toast({
        title: 'Image uploaded',
        description: 'The image has been uploaded successfully',
      });
      
      // Refresh the parent component
      if (onDelete) {
        onDelete();
      }
      
      // Revoke the local object URL to avoid memory leaks
      URL.revokeObjectURL(localPreviewUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteImage = async () => {
    if (confirm('Are you sure you want to remove this image?')) {
      try {
        setIsUploadingImage(true);
        
        const response = await fetch(`/api/files/${id}/image`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete image');
        }
        
        // Clear image preview
        setImagePreview(null);
        
        toast({
          title: 'Image removed',
          description: 'The image has been removed successfully',
        });
        
        // Refresh the parent component
        if (onDelete) {
          onDelete();
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete image',
          variant: 'destructive',
        });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };
  
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className={`p-4 flex ${isEditingName ? 'flex-col' : 'items-center space-x-4'}`}>
        {!isEditingName && (
          <div className="hidden sm:block relative bg-primary/10 rounded-md p-2 flex-shrink-0 w-24 h-24">
            {imagePreview ? (
              <div className="relative w-full h-full cursor-pointer group" onClick={handleImageClick}>
                <div className="absolute inset-0 rounded-md border border-muted overflow-hidden bg-white">
                  <img 
                    src={imagePreview} 
                    alt={name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      console.error("Image failed to load:", imagePreview);
                      // If image fails to load, try again with cache buster
                      e.currentTarget.src = `/api/files/${id}/image?t=${Date.now()}`;
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-20">
                  <Upload className="h-5 w-5 text-white mb-1" />
                  <span className="text-white text-xs">Change</span>
                </div>
              </div>
            ) : (
              <div 
                className="w-full h-full cursor-pointer rounded-md border border-muted"
                style={{ backgroundImage: generatePlaceholderBackground(id) }}
                onClick={handleImageClick}
              />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={isUploadingImage}
            />
          </div>
        )}
        
        <div className={`${isEditingName ? 'w-full' : 'flex-1 min-w-0'}`}>
          {isEditingName ? (
            <div className="w-full mb-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">Edit File Name</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleCancelEditName}
                  disabled={isSavingName}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="text"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                onKeyDown={handleNameKeyPress}
                autoFocus
                className="h-10 text-sm mb-3"
                placeholder="Enter file name"
                disabled={isSavingName}
              />
              <div className="flex justify-end">
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="h-9 px-4"
                >
                  {isSavingName ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center max-w-[90%] sm:max-w-[85%]">
                  <h3 className="font-medium truncate text-sm" title={name}>{name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartEditName}
                    className="ml-1 h-6 w-6 p-0 flex-shrink-0"
                    title="Edit Name"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                <div className="hidden sm:block ml-2 flex-shrink-0">
                  <Select value={selectedVersion.toString()} onValueChange={(value) => setSelectedVersion(parseInt(value))}>
                    <SelectTrigger className="h-6 w-[40px] text-xs px-2">
                      <SelectValue placeholder={selectedVersion.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      {versions.map((version) => (
                        <SelectItem 
                          key={version.id} 
                          value={version.version.toString()}
                          className="text-xs"
                        >
                          {version.version}{version.version === currentVersion && " ★"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                <span>{fileExtension}</span>
                <span>•</span>
                <span>{formatFileSize(size)}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
                <span>•</span>
                <span>{selectedVersion}/{versions.length}</span>
              </div>
              
              {/* Mobile version - simplified metadata */}
              <div className="flex sm:hidden items-center text-xs text-muted-foreground mt-1 space-x-2">
                <span>{fileExtension}</span>
                <span>•</span>
                <span>{formatFileSize(size)}</span>
              </div>
              
              {isEditingTags ? (
                <div className="mt-3">
                  <TagsInput 
                    tags={currentTags}
                    onTagsChange={setCurrentTags}
                    disabled={isSavingTags}
                    showLabel={false}
                    placeholder="Add tags..."
                    suggestedTags={suggestedTags}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="default" 
                      onClick={handleSaveTags}
                      disabled={isSavingTags}
                      className="h-7 text-xs"
                    >
                      {isSavingTags ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleCancelEditTags}
                      disabled={isSavingTags}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {tags.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1 max-h-[28px] overflow-hidden">
                        {tags.slice(0, 3).map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="secondary"
                            className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover:bg-secondary/80"
                            onClick={(e) => handleTagClick(e, tag.name)}
                          >
                            <TagIcon className="h-3 w-3 opacity-70" />
                            {tag.name}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge
                            variant="outline"
                            className="px-2 py-1 text-xs"
                          >
                            +{tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <Button 
                        onClick={() => setIsEditingTags(true)} 
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={() => setIsEditingTags(true)} 
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Add Tags</span>
                      <span className="inline sm:hidden">Tags</span>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        {!isEditingName && (
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Add image button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleImageClick}
              title={imagePreview ? "Change image" : "Add image"}
              className="sm:hidden h-10 w-10"
            >
              {imagePreview ? (
                <div className="relative h-8 w-8 rounded-full overflow-hidden border border-muted bg-white">
                  <img 
                    src={imagePreview} 
                    alt={name} 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // If image fails to load, try again with cache buster
                      e.currentTarget.src = `/api/files/${id}/image?t=${Date.now()}`;
                    }}
                  />
                </div>
              ) : (
                <div 
                  className="relative h-8 w-8 rounded-full overflow-hidden border border-muted"
                  style={{ backgroundImage: generatePlaceholderBackground(id) }}
                />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlay}
              title="Play"
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download"
              className="sm:block hidden h-10 w-10"
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
                    className="hidden sm:flex h-10 w-10"
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
            
            {/* Add option to delete image if one exists */}
            {imagePreview && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Image options"
                    className="hidden sm:flex h-10 w-10"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Image Options</DropdownMenuLabel>
                  <DropdownMenuItem onClick={handleImageClick}>
                    <Upload className="h-4 w-4 mr-2" />
                    Change Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteImage} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Image
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-10 sm:w-10"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 