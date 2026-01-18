import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, MessageCircle, Search, Globe } from 'lucide-react';

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4 md:px-0">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-headline text-primary mb-4">Divine Vision</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore the timeless wisdom of sacred Hindu texts through intelligent search and meaningful conversation.
        </p>
      </header>

      <Tabs defaultValue="explore" className="space-y-8">
        <TabsList className="justify-center">
          <TabsTrigger value="explore">Explore Scriptures</TabsTrigger>
          <TabsTrigger value="features">What You Can Do</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-primary" />
                Śrīmad-Bhāgavatam
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>18,000+ verses</p>
              <p>The great Purana detailing Krishna&apos;s pastimes and Vedic philosophy</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-primary" />
                Viṣṇu Sahasranāma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>1,000 names</p>
              <p>The thousand names of Lord Vishnu with profound meanings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-primary" />
                Lalitā Sahasranāma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>1,000 names</p>
              <p>The thousand names of Goddess Lalita from Brahmanda Purana</p>
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

      <footer className="mt-12 text-center text-muted-foreground">
        Built with reverence for sacred knowledge
      </footer>
    </main>
  );
}