import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Upload, X, Play, Pause, Edit, Check, Image as ImageIcon } from 'lucide-react';
import { TagsInput } from '@/components/TagsInput';
import { playAudio, AudioFile } from '@/components/GlobalAudioPlayer';

// Function to extract tags from filename
// Format: supports both filename[tag1,tag2,tag3].ext and filename[tag1][tag2][tag3].ext
function extractTagsFromFilename(filename: string): { cleanName: string, extractedTags: string[] } {
  const tagRegex = /\[([^\]]+)\]/g;
  let cleanName = filename;
  const extractedTags: string[] = [];
  
  let match;
  while ((match = tagRegex.exec(filename)) !== null) {
    if (match[1]) {
      // Split comma-separated tags and trim each tag
      const tags = match[1].split(',').map(tag => tag.trim()).filter(Boolean);
      extractedTags.push(...tags);
    }
  }
  
  // Remove all [tag] sections from the filename
  cleanName = cleanName.replace(tagRegex, '');
  
  // Clean up extra spaces
  cleanName = cleanName.replace(/\s+/g, ' ').trim();
  
  // Handle possible space before extension
  cleanName = cleanName.replace(/ \.([a-zA-Z0-9]+)$/, '.$1');
  
  return { cleanName, extractedTags };
}

// Define a separate interface to track file metadata 
interface FileMetadata {
  id: string;
  file: File;
  tags: string[];
  previewUrl: string;
  displayName: string; // Custom filename for display and upload
  isEditingName: boolean; // Track if we're currently editing the name
  image?: File; // Added for image upload
  imagePreviewUrl?: string; // Preview URL for the image
}

interface FileUploadProps {
  onUpload: (files: File[], fileTags: Record<string, string[]>, fileNames: Record<string, string>, fileImages?: Record<string, File>) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  suggestedTags?: string[]; // Optional array of suggested tags for autocomplete
  defaultTags?: string[]; // Default tags to apply to all files
  onFileEntriesChange?: (entries: Array<{ id: string; displayName: string }>) => void;
}

export function FileUpload({
  onUpload,
  multiple = false,
  accept = 'audio/*',
  maxSize = 250, // Default 100MB
  disabled = false, // Default to not disabled
  suggestedTags = [], // Default to empty array
  defaultTags = [], // Default to empty array
  onFileEntriesChange
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileEntries, setFileEntries] = useState<FileMetadata[]>([]);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      validateAndSetFiles(fileList);
    }
  };

  const validateAndSetFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the maximum size of ${maxSize}MB`,
          variant: 'destructive',
        });
        return false;
      }

      // Check file type if accept is specified
      if (accept && !file.type.match(accept.replace('*', '.*'))) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a valid audio file`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      // Create file metadata entries
      const newEntries = validFiles.map(file => {
        // Extract tags from filename
        const { cleanName, extractedTags } = extractTagsFromFilename(file.name);
        
        // Combine all tags: default tags + filename tags, ensuring no duplicates
        const allTags = [...new Set([...defaultTags, ...extractedTags])];
        
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file: file,
          tags: allTags,
          previewUrl: URL.createObjectURL(file),
          displayName: cleanName,
          isEditingName: false
        };
      });

      if (multiple) {
        setFileEntries(prev => {
          const updated = [...prev, ...newEntries];
          onFileEntriesChange?.(updated.map(entry => ({ id: entry.id, displayName: entry.displayName })));
          return updated;
        });
      } else {
        // Clean up previous preview URLs to avoid memory leaks
        fileEntries.forEach(entry => {
          URL.revokeObjectURL(entry.previewUrl);
        });
        const updated = newEntries.slice(0, 1);
        setFileEntries(updated);
        onFileEntriesChange?.(updated.map(entry => ({ id: entry.id, displayName: entry.displayName })));
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const fileList = Array.from(e.dataTransfer.files);
      validateAndSetFiles(fileList);
    }
  };

  const removeFile = (index: number) => {
    if (disabled) return;
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(fileEntries[index].previewUrl);
    
    // Reset playing state if removing the current playing file
    if (currentPlayingIndex === index) {
      setCurrentPlayingIndex(null);
    } else if (currentPlayingIndex !== null && currentPlayingIndex > index) {
      // Adjust the currentPlayingIndex if we're removing a file before it
      setCurrentPlayingIndex(currentPlayingIndex - 1);
    }
    
    setFileEntries(prev => {
      const updated = prev.filter((_, i) => i !== index);
      onFileEntriesChange?.(updated.map(entry => ({ id: entry.id, displayName: entry.displayName })));
      return updated;
    });
  };

  const handleImageAdd = (index: number) => {
    if (disabled) return;
    
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // Add change event listener
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || !target.files[0]) return;
      
      const file = target.files[0];
      
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
      
      // Update file entry with image
      setFileEntries(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          image: file,
          imagePreviewUrl: URL.createObjectURL(file)
        };
        return updated;
      });
    });
    
    // Trigger file selection dialog
    input.click();
  };
  
  const handleRemoveImage = (index: number) => {
    if (disabled) return;
    
    setFileEntries(prev => {
      const updated = [...prev];
      const entry = updated[index];
      
      // Revoke object URL to prevent memory leaks
      if (entry.imagePreviewUrl) {
        URL.revokeObjectURL(entry.imagePreviewUrl);
      }
      
      updated[index] = {
        ...entry,
        image: undefined,
        imagePreviewUrl: undefined
      };
      
      return updated;
    });
  };

  const handleUpload = () => {
    if (disabled) return;
    if (fileEntries.length > 0) {
      // Create a mapping of file names to their tags
      const fileTagsMap: Record<string, string[]> = {};
      const customFilenames: Record<string, string> = {};
      const fileImages: Record<string, File> = {};
      const filesToUpload: File[] = [];
      
      // Loop through each file entry
      fileEntries.forEach((entry, index) => {
        // Safety check to ensure entry and file are valid
        if (!entry || !entry.file) return;
        
        // Add the file to our array
        filesToUpload.push(entry.file);
        
        // Store tags using index to guarantee correct matching
        // Combine default tags with file-specific tags
        const allTags = [...new Set([...defaultTags, ...(entry.tags || [])])];
        fileTagsMap[index.toString()] = allTags;
        
        // Always store the display name, whether it's custom or original
        customFilenames[index.toString()] = entry.displayName;
        
        // Store images if present
        if (entry.image) {
          fileImages[index.toString()] = entry.image;
        }
      });

      // Log the final data for debugging
      console.log("Files to upload:", filesToUpload.map(f => f.name));
      console.log("Tags map:", fileTagsMap);
      console.log("Custom filenames:", customFilenames);
      console.log("Images:", Object.keys(fileImages).length > 0 ? fileImages : "No images");

      // Upload the files with their tag information, custom names, and images
      onUpload(filesToUpload, fileTagsMap, customFilenames, fileImages);
      
      // Clean up preview URLs after upload
      fileEntries.forEach(entry => {
        if (entry && entry.previewUrl) {
          URL.revokeObjectURL(entry.previewUrl);
        }
        if (entry && entry.imagePreviewUrl) {
          URL.revokeObjectURL(entry.imagePreviewUrl);
        }
      });
      
      setFileEntries([]);
      setCurrentPlayingIndex(null);
    } else {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload',
        variant: 'destructive',
      });
    }
  };

  const handlePlayAudio = (index: number) => {
    if (disabled) return;
    
    // If we're already playing this file, mark it as not playing
    if (currentPlayingIndex === index) {
      setCurrentPlayingIndex(null);
      return;
    }
    
    setCurrentPlayingIndex(index);
    
    // Use the global audio player
    const entry = fileEntries[index];
    if (entry && entry.previewUrl) {
      // Create an AudioFile object for the global player
      const audioFile: AudioFile = {
        id: entry.id,
        name: entry.displayName, // Use display name instead of original name
        type: entry.file.type,
        size: entry.file.size,
        createdAt: new Date(),
        src: entry.previewUrl
      };
      
      // Set a custom event handler to update our playing state
      const handleGlobalPlayerChange = (e: Event) => {
        const customEvent = e as CustomEvent<AudioFile>;
        if (customEvent.detail.id !== entry.id) {
          // Another file was loaded in the global player
          setCurrentPlayingIndex(null);
        }
        
        // Remove this event listener
        window.removeEventListener('audio:play', handleGlobalPlayerChange);
      };
      
      // Listen for global player events
      window.addEventListener('audio:play', handleGlobalPlayerChange);
      
      // Use the global player
      playAudio(audioFile);
    }
  };

  const handleTagsChange = (index: number, newTags: string[]) => {
    if (disabled) return;
    
    // Clean the new tags
    const cleanTags = Array.isArray(newTags) ? newTags
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0) : [];
    
    setFileEntries(prev => {
      const updated = [...prev];
      // Always include default tags first, then add individual tags
      const allTags = [...new Set([...defaultTags, ...cleanTags])];
      
      updated[index] = {
        ...updated[index],
        tags: allTags
      };
      return updated;
    });
  };
  
  // Toggle filename editing mode
  const toggleFilenameEdit = (index: number) => {
    if (disabled) return;
    
    setFileEntries(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isEditingName: !updated[index].isEditingName
      };
      return updated;
    });
  };
  
  // Update the filename
  const updateFilename = (index: number, newName: string) => {
    if (disabled) return;
    
    // Don't allow empty filenames
    if (!newName.trim()) return;
    
    setFileEntries(prev => {
      const updated = [...prev];
      
      // Ensure we preserve the file extension
      const originalExt = updated[index].file.name.split('.').pop() || '';
      let displayName = newName.trim();
      
      // Add extension if it's missing
      if (!displayName.endsWith(`.${originalExt}`)) {
        displayName = `${displayName}.${originalExt}`;
      }
      
      // Update the entry with the new display name
      updated[index] = {
        ...updated[index],
        displayName,
        isEditingName: false
      };
      
      // Notify parent of the change
      onFileEntriesChange?.(updated.map(entry => ({ id: entry.id, displayName: entry.displayName })));
      return updated;
    });
  };

  return (
    <div className="w-full space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-primary bg-primary/10' : 'border-border'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-semibold">Drag & drop files here</h3>
        <p className="text-sm text-muted-foreground mt-1">
          or click to browse your files
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-2">
          Maximum file size: {maxSize}MB
        </p>
      </div>

      {/* Upload button moved to the top */}
      {fileEntries.length > 0 && (
        <Button
          onClick={handleUpload}
          disabled={fileEntries.length === 0 || disabled}
          className="w-full py-4 text-lg font-semibold shadow-sm relative"
        >
          <span className="flex items-center justify-center gap-2">
            <Upload className="h-5 w-5" />
            Upload {fileEntries.length > 0 ? `${fileEntries.length} File${fileEntries.length > 1 ? 's' : ''}` : ''}
          </span>
        </Button>
      )}

      {fileEntries.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files</Label>
          <ul className="border rounded-md divide-y">
            {fileEntries.map((entry, index) => (
              <li key={entry.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 truncate">
                    {entry.isEditingName ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          defaultValue={entry.displayName.split('.')[0]} // Remove extension for editing
                          className="py-0 px-2 h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateFilename(index, e.currentTarget.value);
                            } else if (e.key === 'Escape') {
                              toggleFilenameEdit(index);
                            }
                          }}
                          onBlur={(e) => updateFilename(index, e.target.value)}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const input = document.querySelector(`input[default-value="${entry.displayName.split('.')[0]}"]`) as HTMLInputElement;
                            updateFilename(index, input?.value || entry.displayName);
                          }}
                          disabled={disabled}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <p className="font-medium truncate">{entry.displayName}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleFilenameEdit(index)}
                          disabled={disabled}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {(entry.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Add image button */}
                    {entry.imagePreviewUrl ? (
                      <div className="relative h-8 w-8 mr-1">
                        <img 
                          src={entry.imagePreviewUrl} 
                          alt="Preview" 
                          className="h-full w-full object-cover rounded-md"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0 h-4 w-4 bg-primary text-primary-foreground rounded-full p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          disabled={disabled}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageAdd(index);
                        }}
                        disabled={disabled}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAudio(index);
                      }}
                      disabled={disabled}
                    >
                      {currentPlayingIndex === index ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Tags input for each file */}
                <div className="mt-2">
                  <TagsInput
                    tags={entry.tags || []}
                    onTagsChange={(newTags) => handleTagsChange(index, newTags)}
                    disabled={disabled}
                    showLabel={false}
                    placeholder="Add tags for this file..."
                    suggestedTags={Array.isArray(suggestedTags) ? suggestedTags : []}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 