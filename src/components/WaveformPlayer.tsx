'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlayCircle, PauseCircle, Volume2, VolumeX } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import '@/styles/waveform.css';

interface WaveformPlayerProps {
  audioUrl: string;
  playing: boolean;
  onPlayPause: () => void;
  className?: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  cursorColor?: string;
  cursorWidth?: number;
}

export function WaveformPlayer({
  audioUrl,
  playing,
  onPlayPause,
  className = '',
  height = 80,
  waveColor = 'rgba(0, 0, 0, 0.2)',
  progressColor = 'hsl(var(--primary))',
  barWidth = 2,
  barGap = 1,
  barRadius = 3,
  cursorColor = 'rgba(0, 0, 0, 0.5)',
  cursorWidth = 1
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [volume, setVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  
  // Format time in minutes:seconds
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    setLoading(true);

    // Create waveform
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      barWidth,
      barGap,
      barRadius,
      cursorColor,
      cursorWidth,
      autoScroll: true,
      dragToSeek: true,
      interact: true,
      // Use a backend that doesn't preload the entire file
      backend: 'MediaElement',
      // Connect to our audio element for streaming
      media: audioRef.current || undefined
    });

    // Set volume
    wavesurfer.setVolume(volume);

    // Events
    wavesurfer.on('ready', () => {
      setLoading(false);
      setDuration(formatTime(wavesurfer.getDuration()));
      
      if (playing) {
        wavesurfer.play();
      }
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(formatTime(wavesurfer.getCurrentTime()));
    });

    wavesurfer.on('finish', () => {
      // When audio finishes, call the onPlayPause to update parent state
      onPlayPause();
    });

    wavesurferRef.current = wavesurfer;

    // Cleanup
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl]);

  // Handle play/pause changes from parent
  useEffect(() => {
    if (!wavesurferRef.current) return;
    
    if (playing) {
      wavesurferRef.current.play();
    } else {
      wavesurferRef.current.pause();
    }
  }, [playing]);

  // Handle volume changes
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!wavesurferRef.current) return;
    
    setVolume(newVolume);
    wavesurferRef.current.setVolume(muted ? 0 : newVolume);
    
    // Also update the audio element volume
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : newVolume;
    }
  }, [muted]);

  // Handle mute toggle
  const toggleMute = useCallback(() => {
    if (!wavesurferRef.current) return;
    
    const newMuted = !muted;
    setMuted(newMuted);
    wavesurferRef.current.setVolume(newMuted ? 0 : volume);
    
    // Also update the audio element muted state
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
  }, [muted, volume]);

  return (
    <div className={`flex flex-col w-full ${className}`}>
      {/* Hidden audio element for streaming playback */}
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="auto"
        onLoadStart={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        style={{ display: 'none' }}
      />
      
      {/* Waveform */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-md">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="w-full cursor-pointer rounded-md overflow-hidden wavesurfer-container"
          style={{ backgroundColor: 'var(--card)' }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center">
          <button 
            onClick={onPlayPause}
            className="mr-2 text-foreground hover:text-primary focus:outline-none"
            disabled={loading}
          >
            {playing ? (
              <PauseCircle size={36} className="text-primary" />
            ) : (
              <PlayCircle size={36} />
            )}
          </button>
          
          <div className="text-xs font-medium text-muted-foreground">
            {currentTime} / {duration}
          </div>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={toggleMute}
            className="mx-2 text-foreground hover:text-primary focus:outline-none"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}