'use client';

import { useSession, signOut } from "next-auth/react";
import { Menu, Upload, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Navigate to a path and close mobile menu with direct navigation
  const navigate = (path: string) => {
    // Using direct window.location navigation for all paths
    // This ensures links work properly across all pages including the upload page
    window.location.href = path;
    setMobileMenuOpen(false);
  };

  // Navigation items for both desktop and mobile
  const navItems = [
    { label: "Files", path: "/files", icon: null },
    { label: "Packs", path: "/packs", icon: null },
    { label: "Tags", path: "/tags", icon: null },
    { label: "Upload", path: "/upload", icon: <Upload className="h-4 w-4" /> },
  ];

  return (
    <header className="border-b relative z-50 bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between bg-background">
        {/* Logo and desktop navigation */}
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <button 
            onClick={() => navigate('/')}
            className="text-xl font-bold cursor-pointer bg-transparent border-none"
          >
            Beats19182
          </button>

          {/* Desktop navigation */}
          {session && (
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`hover:text-primary bg-transparent border-none cursor-pointer flex items-center space-x-1 ${
                    pathname === item.path ? 'text-primary font-medium' : ''
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Auth section and mobile menu toggle */}
        <div className="flex items-center space-x-4">
          {/* Auth buttons */}
          {session ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm">{session.user?.email}</span>
              <Button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="px-4 py-2 text-sm"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => navigate('/auth/signin')}
              className="px-4 py-2 text-sm"
              size="sm"
            >
              Sign In
            </Button>
          )}

          {/* Mobile menu toggle */}
          <button 
            className="md:hidden bg-transparent border-none p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && session && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-black bg-opacity-30" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-0 left-0 right-0 bg-popover border-b shadow-md"
            style={{ backgroundColor: 'var(--popover)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`py-3 hover:text-primary bg-transparent border-none text-left font-medium cursor-pointer flex items-center space-x-2 ${
                    pathname === item.path ? 'text-primary' : ''
                  }`}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
} 