'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { VerseCard } from '@/components/VerseCard';
import { SearchFilters } from '@/components/SearchFilters';
import { ConceptGraph } from '@/components/ConceptGraph';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SearchResult, Language, SourceType } from '@/types';
import { Search, Grid3x3, List, ArrowUpDown } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRouter } from 'next/navigation';

type SortOption = 'relevance' | 'source' | 'date';
type ViewMode = 'list' | 'grid';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [source, setSource] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const router = useRouter();
  
  const debouncedQuery = useDebounce(query, 500);
  
  const searchVerses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery, 
          source, 
          limit: 20,
          weights: { semantic: 0.6, keyword: 0.3, concept: 0.1 }
        })
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, source]);
  
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      searchVerses();
    } else {
      setResults([]);
    }
  }, [debouncedQuery, source, searchVerses]);
  
  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case 'source':
        return sorted.sort((a, b) => a.source.localeCompare(b.source));
      case 'date':
        return sorted.sort((a, b) => {
          const aDate = new Date(a.last_verified).getTime();
          const bDate = new Date(b.last_verified).getTime();
          return bDate - aDate;
        });
      case 'relevance':
      default:
        return sorted.sort((a, b) => b.relevance_score - a.relevance_score);
    }
  }, [results, sortBy]);
  
  const conceptFrequencies = useMemo(() => {
    const freqMap = new Map<string, number>();
    results.forEach(verse => {
      verse.concepts.forEach(concept => {
        freqMap.set(concept, (freqMap.get(concept) || 0) + 1);
      });
    });
    return Array.from(freqMap.entries())
      .map(([name, frequency]) => ({ name, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
  }, [results]);
  
  const handleConceptClick = (concept: string) => {
    setQuery(concept);
  };
  
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg md:text-xl font-semibold">
              {results.length} {language === 'hindi' ? 'परिणाम' : 'Results Found'}
            </h2>
            
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
                <SelectTrigger className="w-40">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="source">Source</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {conceptFrequencies.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">
                {language === 'hindi' ? 'अवधारणाएं' : 'Concepts'}
              </h3>
              <ConceptGraph 
                concepts={conceptFrequencies}
                onConceptClick={handleConceptClick}
              />
            </Card>
          )}
          
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {sortedResults.map((verse) => (
              <VerseCard 
                key={verse.text_id} 
                verse={verse} 
                language={language}
                viewMode="detailed"
                onConceptClick={handleConceptClick}
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