'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalAudioPlayer } from "@/components/GlobalAudioPlayer";
import { playAudio, AudioFile } from "@/components/GlobalAudioPlayer";
import { Badge } from "@/components/ui/badge";

interface Tag {
  id: string;
  name: string;
}

interface FileWithTags extends AudioFile {
  tags: Tag[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [randomFile, setRandomFile] = useState<FileWithTags | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Redirect to files page if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/files");
    }
  }, [session, status, router]);

  // Fetch random file
  const fetchRandomFile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shared/random');
      if (!response.ok) {
        throw new Error('Failed to fetch random file');
      }
      const data = await response.json();
      if (data.file) {
        setRandomFile({
          id: data.file.id,
          name: data.file.name,
          type: data.file.type,
          size: data.file.size,
          createdAt: new Date(data.file.createdAt),
          tags: data.file.tags
        });
      }
    } catch (error) {
      console.error('Error fetching random file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch random file on mount
  useEffect(() => {
    if (status === "unauthenticated") {
      fetchRandomFile();
    }
  }, [status]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // Only show the homepage content if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">Welcome to Beats19182, here is a random audio file!</h2>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading random file...</p>
            </div>
          ) : randomFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{randomFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(randomFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchRandomFile}
                    className="h-8 w-8"
                    title="Refresh random file"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => playAudio(randomFile)}
                    className="h-8 w-8"
                    title="Play file"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {randomFile.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {randomFile.tags.map(tag => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No audio files available</p>
            </div>
          )}
        </div>

        <GlobalAudioPlayer />
      </div>
    );
  }
  
  // This will only show briefly during redirect
  return null;
}
