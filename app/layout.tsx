import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { Navigation } from '@/components/Navigation';
import { Literata } from 'next/font/google';

const literata = Literata({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-literata',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Divine Vision',
  description: 'Explore sacred Hindu texts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={literata.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navigation />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}