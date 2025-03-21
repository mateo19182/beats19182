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

export default function UploadPage() {
  const { toast } = useToast();
  const [tags, setTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
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

  const handleUpload = async (files: File[], fileTags: Record<string, string[]>, customFilenames: Record<string, string>) => {
    setIsUploading(true);
    setUploadProgress({});
    setLogs([]); // Clear previous logs
    
    addLog(`Starting upload of ${files.length} file(s)`, 'info');
    
    // Debug log for fileTags and customFilenames
    console.log('File tags map:', fileTags);
    console.log('Custom filenames map:', customFilenames);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create a unique identifier for this file upload
        const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const fileId = `${file.name}-${uniqueId}`;
        
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        
        // Get the custom filename if one exists
        const customFilename = customFilenames[i.toString()];
        const displayName = customFilename || file.name;
        
        addLog(`Preparing to upload: ${displayName} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'info');
        
        // Get tags for this file - use the index string as the key
        const fileTagsArray = fileTags[i.toString()] || [];
        console.log(`Tags for file ${displayName} (index ${i}):`, fileTagsArray);
        
        // Log any tags assigned to this file
        if (fileTagsArray && fileTagsArray.length > 0) {
          addLog(`File has ${fileTagsArray.length} tags: ${fileTagsArray.join(', ')}`, 'info');
          
          // Add any new tags to our suggested tags list for future autocomplete
          const newTags = fileTagsArray.filter(tag => !suggestedTags.includes(tag));
          if (newTags.length > 0) {
            setSuggestedTags(prev => [...prev, ...newTags]);
          }
        }
        
        // Create a proper FormData instance with clean data
        const formData = new FormData();
        
        // Append the file with a custom filename if specified
        if (customFilename) {
          // We need to create a new File object with the custom name
          // Since we can't modify the name property of an existing File object
          try {
            // Get file extension from original name
            const originalExt = file.name.split('.').pop() || '';
            
            // Create a new file object with the custom name
            const renamedFile = new File(
              [file], 
              customFilename, 
              { type: file.type, lastModified: file.lastModified }
            );
            
            formData.append('file', renamedFile);
            addLog(`Using custom filename: ${customFilename}`, 'info');
          } catch (error) {
            console.error('Error creating new file with custom name:', error);
            // Fallback to original file if renaming fails
            formData.append('file', file);
            // Add the custom name as a field that the backend can use
            formData.append('customFilename', customFilename);
          }
        } else {
          // Use original file
          formData.append('file', file);
        }
        
        // Add per-file tags to the form data
        const tagsToUse = fileTagsArray && fileTagsArray.length > 0 
          ? fileTagsArray 
          : (Array.isArray(tags) ? tags : []); // Use global tags as fallback, ensure it's an array
        
        if (tagsToUse && tagsToUse.length > 0) {
          // Add each tag individually to the form data
          tagsToUse.forEach(tag => {
            if (tag && tag.trim()) { // Only add non-empty tags
              formData.append('tags', tag.trim());
            }
          });
          
          addLog(`Adding tags: ${tagsToUse.join(', ')}`, 'info');
        }
        
        // Create a custom XMLHttpRequest to track progress
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [fileId]: percentComplete }));
            
            // Log progress at 25%, 50%, 75%, and 100%
            if (percentComplete === 25 || percentComplete === 50 || percentComplete === 75 || percentComplete === 100) {
              addLog(`${displayName}: ${percentComplete}% uploaded`, 'info');
            }
          }
        });
        
        // Create a promise to handle the XHR request
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.open('POST', '/api/upload', true);
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response format'));
              }
            } else {
              try {
                const errorResponse = JSON.parse(xhr.responseText);
                reject(new Error(errorResponse.error || 'Upload failed'));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };
          
          xhr.onerror = () => {
            reject(new Error('Network error occurred'));
          };
          
          xhr.send(formData);
        });
        
        try {
          const response = await uploadPromise;
          
          addLog(`Successfully uploaded: ${displayName}`, 'success');
          
          toast({
            title: 'Upload successful',
            description: `${displayName} has been uploaded successfully.`,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          addLog(`Failed to upload ${displayName}: ${errorMessage}`, 'error');
          
          toast({
            title: 'Upload failed',
            description: `${displayName} failed to upload. ${errorMessage}`,
            variant: 'destructive',
          });
        }
      }
      
      addLog(`Upload process completed`, 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      addLog(`Unexpected error: ${errorMessage}`, 'error');
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Upload Audio Files</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <FileUpload 
            onUpload={handleUpload} 
            multiple={true} 
            accept="audio/*"
            maxSize={100}
            disabled={isUploading}
            suggestedTags={suggestedTags}
          />
          
          {/* Progress Bars */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Upload Progress</h3>
              {Object.entries(uploadProgress).map(([fileId, progress]) => {
                // Extract the filename from the fileId by taking everything before the last hyphen
                const lastHyphenIndex = fileId.lastIndexOf('-');
                const displayName = lastHyphenIndex > 0 
                  ? fileId.substring(0, lastHyphenIndex)
                  : fileId;
                
                return (
                  <div key={fileId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate">{displayName}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
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
              <li>Maximum file size is 100MB</li>
              <li>Supported formats: MP3, WAV, OGG, FLAC, AAC, M4A</li>
              <li>Add tags to individual files or set default tags for all files</li>
              <li>Preview your audio before uploading</li>
              <li>You can upload multiple files at once</li>
              <li>Track upload progress in real-time</li>
              <li>View detailed logs of the upload process</li>
              <li>
                <strong>Auto-tag from filename:</strong> Name your files with tags using either format:
                <code className="px-1 py-0.5 bg-background rounded text-xs ml-1">track[tag1,tag2].mp3</code> or 
                <code className="px-1 py-0.5 bg-background rounded text-xs ml-1">track[tag1][tag2].mp3</code>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Global Audio Player */}
      <GlobalAudioPlayer />
    </div>
  );
} 