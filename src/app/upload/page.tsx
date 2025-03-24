'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { TagsInput } from '@/components/TagsInput';
import { GlobalAudioPlayer } from '@/components/GlobalAudioPlayer';

// Define a log entry type
type LogEntry = {
  id: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'pending';
};

// Error entry type
type ErrorEntry = {
  fileName: string;
  error: string;
};

export default function UploadPage() {
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fileEntries, setFileEntries] = useState<Array<{ id: string; displayName: string }>>([]);
  
  // List of suggested tags - we'll populate this from the API
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  
  // Fetch suggested tags from server when component mounts
  useEffect(() => {
    async function fetchSuggestedTags() {
      try {
        // Use the existing /api/tags endpoint instead of /api/tags/popular
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          
          // Extract tag names from the response
          // The API returns an array of objects with { id, name, fileCount }
          const tagNames = Array.isArray(data.tags) 
            ? data.tags.map((tag: { id: string; name: string; fileCount: number }) => tag.name) 
            : [];
            
          // Merge API tags with our default ones, removing duplicates
          setSuggestedTags(prevTags => {
            const allTags = [...prevTags, ...tagNames];
            return [...new Set(allTags)]; // Remove duplicates
          });
          
          console.log('Loaded', tagNames.length, 'tags from API');
        }
      } catch (error) {
        console.log('Error fetching suggested tags:', error);
        // Keep the default tags on error
      }
    }
    
    // Try to fetch tags but don't block the UI
    fetchSuggestedTags();
  }, []);

  // Function to add a log entry
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
      // Check if the last log entry is the same to prevent duplicates
      const lastLog = prev[prev.length - 1];
      if (lastLog && lastLog.message === message && lastLog.type === type) {
        return prev;
      }
      
      const newLog: LogEntry = {
        id: Date.now().toString(),
        message,
        timestamp: new Date(),
        type,
      };
      return [...prev, newLog];
    });
    
    // Scroll to the bottom of logs
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleUpload = async (files: File[], fileTags: Record<string, string[]>, fileNames: Record<string, string>, fileImages?: Record<string, File>) => {
    try {
      setIsUploading(true);
      setErrors([]);
      setSuccessCount(0);
      setUploadProgress({});
      
      // Set up progress tracking
      const totalFiles = files.length;
      setTotalFiles(totalFiles);
      
      // Add initial log
      addLog(`Starting upload of ${files.length} file(s)`, 'pending');
      
      // Upload each file one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = i.toString();
        
        // Get tags for this file or use empty array
        const fileSpecificTags = fileTags[fileIndex] || [];
        
        // Combine default tags with file-specific tags
        const allTags = [...new Set([...tags, ...fileSpecificTags])];
        
        // Get custom filename for this file or use original name
        const customFileName = fileNames[fileIndex] || file.name;
        
        // Create a unique ID for this file in the progress tracker
        const fileProgressId = `file-${i}-${Date.now()}`;
        setUploadProgress(prev => ({ ...prev, [fileProgressId]: 0 }));
        
        // Create a FormData instance
        const formData = new FormData();
        formData.append('file', file);
        
        // Add each tag to the form data
        allTags.forEach(tag => {
          formData.append('tags', tag);
        });
        
        // Always add the custom filename, even if it's the same as the original
        formData.append('customFileName', customFileName);
        
        try {
          // Upload the file
          addLog(`Uploading ${customFileName}...`, 'info');
          setUploadProgress(prev => ({ ...prev, [fileProgressId]: 30 }));
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          
          setUploadProgress(prev => ({ ...prev, [fileProgressId]: 70 }));
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(errorData.error || `Failed to upload ${file.name}`);
          }
          
          const uploadResult = await uploadResponse.json();
          
          // Log the upload result details
          if (uploadResult.message === 'File updated with same content') {
            addLog(`File ${customFileName} was updated as it already existed with the same content`, 'success');
          } else if (uploadResult.file.currentVersion > 1) {
            addLog(`File ${customFileName} was uploaded as version ${uploadResult.file.currentVersion}`, 'success');
          } else {
            addLog(`File ${customFileName} was uploaded successfully`, 'success');
          }
          
          // If we have an image for this file, upload it
          if (fileImages && fileImages[fileIndex]) {
            addLog(`Uploading image for ${customFileName}...`, 'pending');
            
            const fileId = uploadResult.file.id;
            const imageFormData = new FormData();
            imageFormData.append('image', fileImages[fileIndex]);
            
            const imageResponse = await fetch(`/api/files/${fileId}/image`, {
              method: 'POST',
              body: imageFormData,
            });
            
            if (!imageResponse.ok) {
              const errorData = await imageResponse.json();
              addLog(`Warning: Failed to upload image for ${customFileName}: ${errorData.error}`, 'error');
              console.error(`Failed to upload image for ${file.name}:`, errorData.error);
              // Continue execution even if image upload fails
            } else {
              addLog(`Image uploaded for ${customFileName}`, 'success');
            }
          }
          
          // Mark as complete
          setUploadProgress(prev => ({ ...prev, [fileProgressId]: 100 }));
          
          // Increment success count
          setSuccessCount(prev => prev + 1);
          
          // Log success
          // addLog(`Successfully uploaded ${customFileName}`, 'success');
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          
          // Log error
          addLog(`Failed to upload ${customFileName}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          
          setErrors(prev => [
            ...prev,
            {
              fileName: file.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ]);
          
          // Mark as failed in progress
          setUploadProgress(prev => ({ ...prev, [fileProgressId]: -1 }));
        }
        
        // Update overall progress
        setProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      // Final log
      addLog(`Upload process completed: ${files.length} file(s) uploaded successfully`, 'success');
      
      // Show success message
      if (files.length > 0) {
        toast({
          title: 'Upload complete',
          description: `Successfully uploaded ${files.length - errors.length} of ${files.length} files`,
        });
      }
      
      // Reset file list after upload if all succeeded
      if (errors.length === 0) {
        setShowConfirmation(true);
      }
    } catch (error) {
      console.error('Error in upload handler:', error);
      
      addLog(`Unexpected error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`, 'error');
      
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Function to render log entry with appropriate icon
  const renderLogEntry = (log: LogEntry) => {
    const timeString = log.timestamp.toLocaleTimeString();
    let icon;
    let textColorClass;
    
    switch (log.type) {
      case 'success':
        icon = <CheckCircle className="h-4 w-4 text-green-500" />;
        textColorClass = "text-green-600";
        break;
      case 'error':
        icon = <AlertCircle className="h-4 w-4 text-red-500" />;
        textColorClass = "text-red-600";
        break;
      case 'pending':
        icon = <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
        textColorClass = "text-blue-600";
        break;
      default:
        icon = <Clock className="h-4 w-4 text-gray-500" />;
        textColorClass = "text-gray-600";
    }
    
    return (
      <div key={log.id} className="flex items-start space-x-2 py-1 border-b border-gray-100 last:border-0">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <p className={`text-sm ${textColorClass}`}>{log.message}</p>
          <p className="text-xs text-gray-400">{timeString}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Upload Audio Files</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Upload Button at the top - more noticeable */}
          {Object.keys(uploadProgress).length === 0 && (
            <Button 
              onClick={() => document.querySelector('button[class*="w-full"]:not([class*="py-6"])') as HTMLButtonElement}
              disabled={isUploading}
              className="w-full py-6 text-lg font-bold"
            >
              Upload Files
            </Button>
          )}

          <FileUpload 
            onUpload={handleUpload} 
            multiple={true} 
            accept="audio/*"
            maxSize={100}
            disabled={isUploading}
            suggestedTags={suggestedTags}
            defaultTags={tags}
            onFileEntriesChange={setFileEntries}
          />
          
          {/* Progress Bars */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Upload Progress</h3>
              {Object.entries(uploadProgress).map(([fileId, progress]) => {
                // Get the file index from the fileId (format: file-{index}-{timestamp})
                const match = fileId.match(/file-(\d+)-/);
                const fileIndex = match ? parseInt(match[1]) : -1;
                const file = fileIndex >= 0 ? fileEntries[fileIndex] : null;
                const displayName = file ? file.displayName : fileId;
                
                return (
                  <div key={fileId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{displayName}</span>
                      <span>{progress < 0 ? 'Failed' : `${progress}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          progress < 0 ? 'bg-destructive' : 'bg-primary'
                        }`}
                        style={{ width: `${progress < 0 ? 100 : progress}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Upload Logs */}
          {logs.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <h3 className="font-medium">Upload Logs</h3>
              </div>
              <div className="p-4 max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {logs.map(renderLogEntry)}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Default Tags</h2>
            <p className="text-sm text-muted-foreground mb-4">
              These tags will be applied to all files that don't have specific tags.
            </p>
            
            <TagsInput
              tags={tags || []}
              onTagsChange={setTags}
              disabled={isUploading}
              suggestedTags={suggestedTags || []}
            />
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Tips for uploading</h3>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Files: ≤100MB, formats: MP3, WAV, OGG, FLAC, AAC, M4A</li>
              <li>Tag files individually or set defaults</li>
              <li>Add images, preview audio, multi-file uploads</li>
              <li>Real-time progress & detailed logs</li>
              <li>
                <strong>Auto-tag:</strong> Use 
                <code className="px-1 py-0.5 bg-background rounded text-xs ml-1">track[tag1,tag2].mp3</code> or 
                <code className="px-1 py-0.5 bg-background rounded text-xs ml-1">track[tag1][tag2].mp3</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </>
  );
} 