'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { SearchResult, ViewMode, Language, SourceType } from '@/types';
import { Bookmark, Share2, Quote, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { formatVerseReference } from '@/lib/rag/citationGenerator';

interface VerseCardProps {
  verse: SearchResult;
  language: Language;
  viewMode?: ViewMode;
  onBookmark?: () => void;
  onShare?: () => void;
  onCite?: () => void;
  onConceptClick?: (concept: string) => void;
}

const sourceColors: Record<SourceType, string> = {
  bhagavatam: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  vishnu_sahasranam: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  lalita_sahasranam: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700'
};

function getSourceLabel(source: SourceType): string {
  switch (source) {
    case 'bhagavatam':
      return 'Śrīmad-Bhāgavatam';
    case 'vishnu_sahasranam':
      return 'Viṣṇu Sahasranāma';
    case 'lalita_sahasranam':
      return 'Lalitā Sahasranāma';
  }
}

export function VerseCard({ 
  verse, 
  language, 
  viewMode = 'detailed',
  onBookmark,
  onShare,
  onCite,
  onConceptClick
}: VerseCardProps) {
  const [showSanskrit, setShowSanskrit] = useState(false);
  const [expanded, setExpanded] = useState(viewMode === 'study');
  
  const translation = verse.translations[language] || verse.translations.english;
  const commentary = translation.purport;
  
  const isCompact = viewMode === 'compact';
  const isStudy = viewMode === 'study';
  
  return (
    <Card className="verse-card group hover:shadow-lg hover:border-primary/40 transition-all duration-300 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={`source-badge ${sourceColors[verse.source]} text-xs`}
            >
              {getSourceLabel(verse.source)}
            </Badge>
            <code className="text-xs md:text-sm font-mono text-muted-foreground">
              {verse.text_id}
            </code>
          </div>
          
          <div className="flex items-center gap-2">
            {verse.similarity > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary w-fit text-xs">
                {(verse.similarity * 100).toFixed(0)}% match
              </Badge>
            )}
            
            {!isCompact && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onBookmark && (
                  <Button variant="ghost" size="icon" onClick={onBookmark} className="h-7 w-7">
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onShare && (
                  <Button variant="ghost" size="icon" onClick={onShare} className="h-7 w-7">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onCite && (
                  <Button variant="ghost" size="icon" onClick={onCite} className="h-7 w-7">
                    <Quote className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
        {!isCompact && (
          <div className="flex items-center gap-2">
            <Switch 
              checked={showSanskrit} 
              onCheckedChange={setShowSanskrit}
              className="data-[state=checked]:bg-primary"
            />
            <Label className="text-xs md:text-sm cursor-pointer" onClick={() => setShowSanskrit(!showSanskrit)}>
              {language === 'hindi' ? 'संस्कृत दिखाएं' : 'Show Sanskrit'}
            </Label>
          </div>
        )}
        
        {showSanskrit && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-primary/20">
            <CardContent className="p-3 md:p-4">
              <Tabs defaultValue="devanagari">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="devanagari" className="text-xs md:text-sm">देवनागरी</TabsTrigger>
                  <TabsTrigger value="iast" className="text-xs md:text-sm">IAST</TabsTrigger>
                  {verse.sanskrit.word_breakdown && verse.sanskrit.word_breakdown.length > 0 && (
                    <TabsTrigger value="breakdown" className="text-xs md:text-sm">Word-for-Word</TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="devanagari" className="mt-3 md:mt-4">
                  <p className="text-base md:text-xl leading-relaxed font-devanagari text-center">
                    {verse.sanskrit.devanagari}
                  </p>
                </TabsContent>
                <TabsContent value="iast" className="mt-3 md:mt-4">
                  <p className="text-sm md:text-lg font-mono break-words text-center">
                    {verse.sanskrit.iast}
                  </p>
                </TabsContent>
                {verse.sanskrit.word_breakdown && verse.sanskrit.word_breakdown.length > 0 && (
                  <TabsContent value="breakdown" className="mt-3 md:mt-4 space-y-2">
                    {verse.sanskrit.word_breakdown.map((word, idx) => (
                      <div key={idx} className="flex gap-4 text-sm">
                        <span className="font-semibold w-32">{word.transliteration}</span>
                        <span className="text-muted-foreground flex-1">{word.meaning}</span>
                      </div>
                    ))}
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <div>
          <h4 className="text-xs md:text-sm font-semibold mb-2 text-primary">
            {language === 'hindi' ? 'अनुवाद' : 'Translation'}
          </h4>
          <p className="text-sm md:text-base leading-relaxed">{translation.text}</p>
          {translation.translator && (
            <p className="text-xs text-muted-foreground mt-2">
              — {translation.translator}
            </p>
          )}
        </div>

        {commentary && !isCompact && (
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mb-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {expanded ? 'Hide' : 'Show'} Commentary
              {expanded ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
            
            {expanded && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
                  {commentary}
                </p>
              </div>
            )}
          </div>
        )}
        
        {verse.concepts && verse.concepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2">
            {verse.concepts.map((concept: string) => (
              <Badge 
                key={concept} 
                variant="outline" 
                className="border-primary/30 text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => onConceptClick?.(concept)}
              >
                {concept}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}