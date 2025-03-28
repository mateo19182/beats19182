import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ClientLayout } from "@/components/ClientLayout";
import { UmamiScript } from "@/components/UmamiScript";
import initializeServices from "@/lib/init";

// Initialize services on server startup
// This is wrapped in a try-catch to prevent the app from crashing if initialization fails
if (typeof window === 'undefined') {
  try {
    initializeServices()
      .then(success => {
        if (success) {
          console.log('Services initialized successfully');
        } else {
          console.error('Services initialization failed');
        }
      })
      .catch(error => {
        console.error('Error initializing services:', error);
      });
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Beats19182",
  description: "Self-hosted audio file management and sharing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <ClientLayout>
              {children}
            </ClientLayout>
          </div>
        </AuthProvider>
        <UmamiScript />
      </body>
    </html>
  );
}
