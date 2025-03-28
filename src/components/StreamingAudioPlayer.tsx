'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PlayCircle, PauseCircle, Volume2, VolumeX } from 'lucide-react';

interface StreamingAudioPlayerProps {
  audioUrl: string;
  playing: boolean;
  onPlayPause: () => void;
  className?: string;
}

// Size of each chunk to fetch (in bytes)
const CHUNK_SIZE = 1024 * 512; // 512KB chunks

export function StreamingAudioPlayer({
  audioUrl,
  playing,
  onPlayPause,
  className = '',
}: StreamingAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize audio playback with streaming
  const initializeStreamingAudio = useCallback(async () => {
    if (!audioUrl || !audioRef.current) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      loadingRef.current = true;

      // Abort any existing fetch operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new abort controller for this fetch
      abortControllerRef.current = new AbortController();

      // First, fetch the file headers to get file size and check if range requests are supported
      const headResponse = await fetch(audioUrl, {
        method: 'HEAD',
        signal: abortControllerRef.current.signal,
      });

      if (!headResponse.ok) {
        throw new Error(`Failed to fetch audio: ${headResponse.status} ${headResponse.statusText}`);
      }

      const acceptRanges = headResponse.headers.get('Accept-Ranges');
      const contentLength = headResponse.headers.get('Content-Length');
      
      // If range requests are not supported or Content-Length is not available,
      // fallback to normal audio element loading
      if (acceptRanges !== 'bytes' || !contentLength) {
        console.log('Range requests not supported, falling back to normal loading');
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setIsLoading(false);
        loadingRef.current = false;
        return;
      }

      const fileSize = parseInt(contentLength, 10);
      
      // Use MediaSource if the browser supports it
      if ('MediaSource' in window) {
        const mediaSource = new MediaSource();
        const sourceUrl = URL.createObjectURL(mediaSource);
        audioRef.current.src = sourceUrl;

        mediaSource.addEventListener('sourceopen', async () => {
          let mimeType = 'audio/wav'; // Default for WAV files
          
          // Try to determine MIME type from the Content-Type header
          const contentType = headResponse.headers.get('Content-Type');
          if (contentType) {
            mimeType = contentType;
          }

          // For WAV files, we need to use a more specific MIME type with codec info
          if (mimeType.includes('wav')) {
            // WAV is not well supported in MSE, but we'll try a generic audio type
            mimeType = 'audio/wav; codecs="1"';
          }

          // Some browsers may not support the specific codec, so catch this error
          try {
            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            
            // Buffer to hold received chunks
            let buffer = new Uint8Array(0);
            let offset = 0;
            let isFirstChunk = true;

            const appendNextChunk = async () => {
              if (loadingRef.current === false) {
                return;
              }

              try {
                // Calculate the size of the next chunk to fetch
                const end = Math.min(offset + CHUNK_SIZE - 1, fileSize - 1);
                
                // Fetch the chunk
                const response = await fetch(audioUrl, {
                  headers: {
                    Range: `bytes=${offset}-${end}`
                  },
                  signal: abortControllerRef.current?.signal
                });

                if (!response.ok) {
                  throw new Error(`Failed to fetch chunk: ${response.status} ${response.statusText}`);
                }

                // Get the chunk data
                const chunk = await response.arrayBuffer();
                
                // If it's the first chunk and we're dealing with WAV, 
                // we might need special handling to ensure proper playback
                if (isFirstChunk && mimeType.includes('wav')) {
                  isFirstChunk = false;
                  
                  // For WAV files, ensure we have the header in the first chunk
                  // WAV headers are typically 44 bytes
                  if (chunk.byteLength < 44) {
                    console.warn('First chunk is too small for WAV header');
                  }
                }

                // Wait if source buffer is updating
                if (sourceBuffer.updating) {
                  await new Promise<void>(resolve => {
                    sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                  });
                }

                // Append the chunk to the source buffer
                sourceBuffer.appendBuffer(chunk);

                // Wait for the append to complete
                await new Promise<void>(resolve => {
                  sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
                });

                // Start playing after first chunk is loaded, if playing is true
                if (offset === 0 && playing && audioRef.current) {
                  audioRef.current.play().catch(err => {
                    console.error('Error playing audio:', err);
                  });
                }

                // Update offset for next chunk
                offset = end + 1;
                
                // If we haven't reached the end of the file, fetch the next chunk
                if (offset < fileSize && loadingRef.current) {
                  await appendNextChunk();
                } else if (offset >= fileSize && mediaSource.readyState === 'open') {
                  // End of file reached, close the MediaSource
                  mediaSource.endOfStream();
                }
              } catch (err: any) {
                if (err.name !== 'AbortError') {
                  console.error('Error fetching/appending chunk:', err);
                  setError('Error streaming audio');
                }
              }
            };

            // Start fetching and appending chunks
            await appendNextChunk();
          } catch (err: any) {
            console.error('Error with MediaSource or codec:', err);
            
            // Fallback to normal audio element for unsupported codec
            console.log('Falling back to normal audio element (codec not supported in MSE)');
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.load();
            }
          }
        });
      } else {
        // Fallback for browsers without MediaSource support
        console.log('MediaSource not supported, falling back to normal loading');
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
    } catch (err: any) {
      console.error('Error initializing streaming audio:', err);
      setError(err.message || 'Failed to load audio');
      
      // Fallback to normal audio element on error
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [audioUrl]);

  // Effect to initialize streaming when the URL changes
  useEffect(() => {
    if (audioUrl) {
      initializeStreamingAudio();
    }
    
    // Cleanup function to abort any ongoing fetches and free resources
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      loadingRef.current = false;
    };
  }, [audioUrl, initializeStreamingAudio]);

  // Effect to handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    } else {
      audioRef.current.pause();
    }
  }, [playing]);

  // Handle mute toggle
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    audioRef.current.muted = !audioRef.current.muted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button 
        onClick={onPlayPause}
        className="flex-shrink-0 mr-2 text-primary hover:text-primary/80 transition"
        disabled={isLoading || !!error}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <PauseCircle size={30} />
        ) : (
          <PlayCircle size={30} />
        )}
      </button>
      
      <button
        onClick={toggleMute}
        className="flex-shrink-0 ml-2 text-primary hover:text-primary/80 transition"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX size={20} />
        ) : (
          <Volume2 size={20} />
        )}
      </button>
      
      {error && (
        <div className="text-destructive text-sm ml-2">
          {error}
        </div>
      )}
      
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="auto" />
    </div>
  );
}
