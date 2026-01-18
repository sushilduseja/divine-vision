'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { SearchResult } from '@/types';

interface VerseCardProps {
  verse: SearchResult;
  language: 'english' | 'hindi';
}

export function VerseCard({ verse, language }: VerseCardProps) {
  const [showSanskrit, setShowSanskrit] = useState(false);
  
  const translation = language === 'hindi' 
    ? verse.hindi_translation 
    : verse.english_translation;
  
  const commentary = language === 'hindi'
    ? verse.commentary_hindi
    : verse.commentary_english;
  
  return (
    <Card className="hover:shadow-lg hover:border-primary/40 transition-all border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-xs md:text-sm font-mono text-muted-foreground">
            {verse.text_id}
          </CardTitle>
          {verse.similarity > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary w-fit">
              {(verse.similarity * 100).toFixed(0)}% match
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4">
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
        
        {showSanskrit && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 md:p-4">
              <Tabs defaultValue="devanagari">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="devanagari" className="text-xs md:text-sm">देवनागरी</TabsTrigger>
                  <TabsTrigger value="iast" className="text-xs md:text-sm">IAST</TabsTrigger>
                </TabsList>
                <TabsContent value="devanagari" className="mt-3 md:mt-4">
                  <p className="text-base md:text-xl leading-relaxed font-devanagari">
                    {verse.sanskrit_devanagari}
                  </p>
                </TabsContent>
                <TabsContent value="iast" className="mt-3 md:mt-4">
                  <p className="text-sm md:text-lg font-mono break-words">
                    {verse.sanskrit_iast}
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
        
        <div>
          <h4 className="text-xs md:text-sm font-semibold mb-2 text-primary">
            {language === 'hindi' ? 'अनुवाद' : 'Translation'}
          </h4>
          <p className="text-sm md:text-base leading-relaxed">{translation}</p>
        </div>

        {commentary && (
          <div>
            <h4 className="text-xs md:text-sm font-semibold mb-2 text-primary">
              {language === 'hindi' ? 'टिप्पणी' : 'Commentary'}
            </h4>
            <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">{commentary}</p>
          </div>
        )}
        
        {verse.concepts && verse.concepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 md:gap-2 pt-2">
            {verse.concepts.map((concept: string) => (
              <Badge key={concept} variant="outline" className="border-primary/30 text-xs">
                {concept}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}