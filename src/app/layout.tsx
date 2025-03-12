import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ClientLayout } from "@/components/ClientLayout";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Beats19182 - Audio File Manager",
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
      </body>
    </html>
  );
}
