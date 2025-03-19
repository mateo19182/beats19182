'use client';

import { useState, useRef, useCallback } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { TagsInput } from '@/components/TagsInput';

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

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress({});
    setLogs([]); // Clear previous logs
    
    addLog(`Starting upload of ${files.length} file(s)`, 'info');
    
    try {
      for (const file of files) {
        const fileId = file.name + Date.now();
        setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
        addLog(`Preparing to upload: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'info');
        
        const formData = new FormData();
        formData.append('file', file);
        
        // Add tags to the form data
        tags.forEach(tag => {
          formData.append('tags', tag);
        });
        
        // Create a custom XMLHttpRequest to track progress
        const xhr = new XMLHttpRequest();
        
        // Set up progress tracking
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({ ...prev, [fileId]: percentComplete }));
            
            // Log progress at 25%, 50%, 75%, and 100%
            if (percentComplete === 25 || percentComplete === 50 || percentComplete === 75 || percentComplete === 100) {
              addLog(`${file.name}: ${percentComplete}% uploaded`, 'info');
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
          
          addLog(`Successfully uploaded: ${file.name}`, 'success');
          
          toast({
            title: 'Upload successful',
            description: `${file.name} has been uploaded successfully.`,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          addLog(`Failed to upload ${file.name}: ${errorMessage}`, 'error');
          
          toast({
            title: 'Upload failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
      
      addLog(`Upload process completed`, 'info');
    } catch (error) {
      console.error('Upload error:', error);
      addLog(`Upload process error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
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
          />
          
          {/* Progress Bars */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Upload Progress</h3>
              {Object.entries(uploadProgress).map(([fileId, progress]) => (
                <div key={fileId} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{fileId.split(Date.now().toString())[0]}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
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
            <h2 className="text-xl font-semibold mb-4">Add Tags</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Tags help you organize and find your audio files more easily.
            </p>
            
            <TagsInput
              tags={tags}
              onTagsChange={setTags}
              disabled={isUploading}
            />
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Tips for uploading</h3>
            <ul className="text-sm space-y-1 list-disc pl-4">
              <li>Maximum file size is 100MB</li>
              <li>Supported formats: MP3, WAV, OGG, FLAC, AAC, M4A</li>
              <li>Add descriptive tags to make your files easier to find</li>
              <li>You can upload multiple files at once</li>
              <li>Track upload progress in real-time</li>
              <li>View detailed logs of the upload process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 