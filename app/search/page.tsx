'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { VerseCard } from '@/components/VerseCard';
import { SearchFilters } from '@/components/SearchFilters';
import { ConceptGraph } from '@/components/ConceptGraph';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchResult } from '@/types';
import { Search } from 'lucide-react';

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<'english' | 'hindi'>('english');
  const [source, setSource] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  const debouncedQuery = useDebounce(query, 500);
  
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      searchVerses();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, source]);
  
  async function searchVerses() {
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: debouncedQuery, source, limit: 20 })
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
      <div className="mb-6 md:mb-8 space-y-4 md:space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Search Scriptures
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Find verses by their meaning, themes, or concepts
          </p>
        </div>

        <Card className="p-4 md:p-6 border-primary/20">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={
                  language === 'hindi'
                    ? 'भक्ति, धर्म, कृष्ण के बारे में खोजें...'
                    : 'Search for devotion, dharma, Krishna...'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-base md:text-lg h-12 md:h-14 pl-10 border-input focus-visible:ring-primary"
              />
            </div>
            
            <SearchFilters
              source={source}
              onSourceChange={setSource}
              language={language}
              onLanguageChange={setLanguage}
            />
          </div>
        </Card>
      </div>
      
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4 md:p-6">
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-20 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      )}
      
      {!loading && results.length > 0 && (
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-semibold">
              {results.length} {language === 'hindi' ? 'परिणाम' : 'Results Found'}
            </h2>
            {results.map((verse) => (
              <VerseCard 
                key={verse.text_id} 
                verse={verse} 
                language={language}
              />
            ))}
          </div>
        </div>
      )}
      
      {!loading && results.length === 0 && debouncedQuery.length > 2 && (
        <Card className="p-8 md:p-12 text-center">
          <p className="text-muted-foreground">
            {language === 'hindi' 
              ? 'कोई परिणाम नहीं मिला। अलग खोजशब्द आज़माएं।'
              : 'No results found. Try different keywords.'}
          </p>
        </Card>
      )}

      {!loading && debouncedQuery.length <= 2 && (
        <Card className="p-8 md:p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {language === 'hindi'
              ? 'खोज शुरू करने के लिए कम से कम 3 अक्षर टाइप करें'
              : 'Type at least 3 characters to start searching'}
          </p>
        </Card>
      )}
    </div>
  );
}