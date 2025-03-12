'use client';

import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Toaster />
    </>
  );
} 