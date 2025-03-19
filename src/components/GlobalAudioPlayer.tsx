'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import '@/styles/audio-player.css';
import { ChevronUp, ChevronDown, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudioFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: Date;
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const playerRef = useRef<any>(null);

  const handleAudioPlay = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<AudioFile>;
    const file = customEvent.detail;
    setCurrentFile(file);
    setIsLoading(true);
    setAudioSrc(`/api/files/${file.id}`);
    setIsExpanded(true); // Auto-expand when a new file is played
  }, []);

  useEffect(() => {
    // Add event listener for play events
    window.addEventListener(AUDIO_EVENTS.PLAY, handleAudioPlay);
    
    // Clean up when component unmounts
    return () => {
      window.removeEventListener(AUDIO_EVENTS.PLAY, handleAudioPlay);
    };
  }, [handleAudioPlay]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleLoadedData = () => {
    setIsLoading(false);
  };

  if (!isVisible || !currentFile) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg transition-all duration-300 z-50",
        isExpanded ? "h-auto pb-4" : "h-14",
        "md:pb-2"
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-8 right-4 bg-card p-1 rounded-t-md border border-b-0"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>
      
      <div className="flex items-center px-4 h-14">
        <div className="bg-primary/10 rounded-md p-2 flex-shrink-0 mr-3">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div className="truncate flex-1">
          <div className="font-medium truncate">{currentFile.name}</div>
          <div className="text-xs text-muted-foreground">
            {isLoading ? 'Loading...' : playerRef.current?.audio?.current?.duration 
              ? `Duration: ${formatTime(playerRef.current.audio.current.duration)}`
              : ''}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pt-0 pb-1">
          <AudioPlayer
            ref={playerRef}
            src={audioSrc}
            autoPlay
            showJumpControls={true}
            showSkipControls={false}
            listenInterval={1000}
            autoPlayAfterSrcChange={true}
            onLoadedData={handleLoadedData}
            className="audio-player-custom"
            style={{
              boxShadow: 'none',
              background: 'transparent'
            }}
          />
        </div>
      )}
    </div>
  );
} 