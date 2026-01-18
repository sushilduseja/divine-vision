'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle, Search, Globe, ArrowRight } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="container mx-auto py-8 px-4 md:px-0">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-headline text-primary mb-4">Divine Vision</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Explore the timeless wisdom of sacred Hindu texts through intelligent search and meaningful conversation.
        </p>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search verses by meaning, concept, or question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-base h-12"
            />
            <Button type="submit" size="lg" className="h-12 px-6">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </form>
      </header>

      <Tabs defaultValue="explore" className="space-y-8">
        <TabsList className="justify-center">
          <TabsTrigger value="explore">Explore Scriptures</TabsTrigger>
          <TabsTrigger value="features">What You Can Do</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/browse?source=bhagavatam')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Śrīmad-Bhāgavatam
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">18,000+ verses</p>
              <p className="text-sm">The great Purana detailing Krishna&apos;s pastimes and Vedic philosophy</p>
              <Button variant="outline" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/browse?source=bhagavatam'); }}>
                Browse
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/browse?source=vishnu_sahasranam')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Viṣṇu Sahasranāma
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">1,000 names</p>
              <p className="text-sm">The thousand names of Lord Vishnu with profound meanings</p>
              <Button variant="outline" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/browse?source=vishnu_sahasranam'); }}>
                Browse
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => router.push('/browse?source=lalita_sahasranam')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Lalitā Sahasranāma
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">1,000 names</p>
              <p className="text-sm">The thousand names of Goddess Lalita from Brahmanda Purana</p>
              <Button variant="outline" className="mt-4 w-full" onClick={(e) => { e.stopPropagation(); router.push('/browse?source=lalita_sahasranam'); }}>
                Browse
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="mr-2 h-5 w-5 text-primary" />
                  Intelligent Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Find verses by meaning, not just keywords</li>
                  <li>Explore concepts across all scriptures</li>
                  <li>Discover related teachings</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                  Conversational AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Ask questions in natural language</li>
                  <li>Get contextual answers with verse citations</li>
                  <li>Available in English, Sanskrit, and Hindi</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="mr-2 h-5 w-5 text-primary" />
                  Deep Study
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2">
                  <li>View Sanskrit in Devanagari and IAST</li>
                  <li>Access word-by-word meanings</li>
                  <li>Read authentic commentaries</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <footer className="mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
        <p>Built with reverence for sacred knowledge</p>
        <p className="mt-2 text-xs">
          Divine Vision uses AI to help explore Hindu scriptures. For authoritative 
          spiritual guidance, please consult qualified teachers in traditional lineages.
        </p>
      </footer>
    </main>
  );
}