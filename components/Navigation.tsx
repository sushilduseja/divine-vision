'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Moon, Sun, BookOpen, Search, MessageCircle, Home } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navigation() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-headline text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
              <BookOpen className="h-5 w-5" />
              <span>Divine Vision</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-4">
              <Link 
                href="/" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              <Link 
                href="/search" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Search className="h-4 w-4" />
                Search
              </Link>
              <Link 
                href="/chat" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </Link>
              <Link 
                href="/browse" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <BookOpen className="h-4 w-4" />
                Browse
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
