'use client';

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, Upload } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold">
            Beats19182
          </Link>
          {session && (
            <nav className="hidden md:flex items-center space-x-4">
              <Link href="/files" className="hover:text-primary">
                Files
              </Link>
              <Link href="/packs" className="hover:text-primary">
                Packs
              </Link>
              <Link href="/tags" className="hover:text-primary">
                Tags
              </Link>
              <Link href="/upload" className="flex items-center space-x-1 hover:text-primary">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {session ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm">{session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Sign In
            </Link>
          )}
          <button className="md:hidden">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
} 