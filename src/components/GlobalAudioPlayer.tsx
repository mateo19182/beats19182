'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WaveformPlayer } from './WaveformPlayer';
import { toast } from '@/components/ui/use-toast';

export interface AudioFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
  version?: number;
  src?: string;
}

interface GlobalAudioPlayerProps {
  isVisible?: boolean;
}

// Create a global event system
export const AUDIO_EVENTS = {
  PLAY: 'audio:play',
}

export function playAudio(file: AudioFile) {
  const event = new CustomEvent(AUDIO_EVENTS.PLAY, { detail: file });
  window.dispatchEvent(event);
}

export function GlobalAudioPlayer({ isVisible = true }: GlobalAudioPlayerProps) {
  const [currentFile, setCurrentFile] = useState<AudioFile | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudioPlay = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<AudioFile>;
    const file = customEvent.detail;
    setCurrentFile(file);
    
    // If the file has a direct src URL (for previews), use it directly
    if (file.src) {
      setAudioSrc(file.src);
      setIsPlaying(true);
      return;
    }
    
    // Set the API endpoint URL - now optimized for streaming
    const url = file.version
      ? `/api/files/${file.id}?version=${file.version}`
      : `/api/files/${file.id}`;
    
    setAudioSrc(url);
    setIsPlaying(true);
  }, []);

  useEffect(() => {
    // Add event listener for play events
    window.addEventListener(AUDIO_EVENTS.PLAY, handleAudioPlay);
    
    // Clean up when component unmounts
    return () => {
      window.removeEventListener(AUDIO_EVENTS.PLAY, handleAudioPlay);
    };
  }, [handleAudioPlay]);

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleClose = () => {
    setCurrentFile(null);
    setIsPlaying(false);
  };

  if (!isVisible || !currentFile) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-popover border-t shadow-lg z-50 h-auto pb-4"
      style={{ backgroundColor: 'var(--popover)' }}
    >
      <button
        onClick={handleClose}
        className="absolute -top-8 right-4 bg-popover p-1 rounded-t-md border border-b-0"
        style={{ backgroundColor: 'var(--popover)' }}
      >
        <X size={16} />
      </button>
      
      <div className="flex items-center px-4 h-14">
        <div className="bg-primary/10 rounded-md p-2 flex-shrink-0 mr-3">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div className="truncate flex-1">
          <div className="font-medium truncate">{currentFile.name}</div>
        </div>
      </div>
      
      <div className="px-4 pt-0 pb-1">
        <WaveformPlayer 
          audioUrl={audioSrc}
          playing={isPlaying}
          onPlayPause={handlePlayPause}
          height={60}
          progressColor="hsl(var(--primary))"
          waveColor="rgba(0, 0, 0, 0.15)"
          barWidth={2}
          barGap={2}
          barRadius={2}
        />
      </div>
    </div>
  );
}