'use client';

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect to files page if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/files");
    }
  }, [session, status, router]);
  
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Welcome to Beats19182</h1>
          <p className="text-xl text-muted-foreground">
            Self-hosted platform for managing and sharing audio files
          </p>
        </div>
        <div className="p-6 rounded-lg border">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <p>Create an account or sign in to:</p>
            <ul className="space-y-2">
              <li>📤 Upload your first audio file</li>
              <li>🎵 Create your first pack</li>
              <li>🌐 Share with others</li>
            </ul>
            <Link
              href="/auth/signin"
              className="mt-4 inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // This will only show briefly during redirect
  return null;
}
