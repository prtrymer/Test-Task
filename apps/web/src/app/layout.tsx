import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/lib/query/provider';
import './globals.css';

// globals.css maps Tailwind's font tokens onto these variables, so they have to
// be defined on the root element or everything falls back to serif.
const sans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Data Room',
  description: 'A secure repository for due diligence documents',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
