'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from '@/components/ChatMessage';
import { Loader2, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import { ChatMessage as ChatMessageType, ChatMode, Language } from '@/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<Language>('english');
  const [mode, setMode] = useState<ChatMode>('conversational');
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  async function sendMessage() {
    if (!input.trim() || loading) return;
    
    const userMessage: ChatMessageType = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          language,
          mode,
          history: messages.slice(-6)
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: Date.now()
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          sources: data.sources,
          timestamp: Date.now(),
          metadata: data.metadata
        }]);
        
        if (data.metadata?.has_disclaimer) {
          setShowDisclaimer(true);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please try again.',
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  }
  
  const exampleQuestions = [
    'What is the relationship between dharma and bhakti?',
    'Explain the concept of karma',
    'How do scriptures describe divine love?'
  ];
  
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
      <Card className="h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] flex flex-col border-primary/20">
        <div className="p-3 md:p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg md:text-xl font-semibold text-primary">Ask Questions</h2>
          </div>
          <div className="flex gap-2">
            <Select value={mode} onValueChange={(v: ChatMode) => setMode(v)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="scholarly">Scholarly</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={(v: Language) => setLanguage(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">हिन्दी</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {showDisclaimer && (
          <Alert className="m-3 md:m-4 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs md:text-sm">
              <strong>Important:</strong> AI responses are interpretations based on textual analysis. 
              They are not substitutes for guidance from living gurus or traditional commentaries. 
              For practices, rituals, or spiritual questions, seek qualified teachers.
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-auto p-0 text-xs underline"
                onClick={() => setShowDisclaimer(false)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center py-8 md:py-12 space-y-4">
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                {language === 'hindi' ? 'उदाहरण प्रश्न' : 'Example Questions'}
              </h3>
              <div className="space-y-2 max-w-xl mx-auto">
                {exampleQuestions.map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full text-left justify-start h-auto py-3 px-4 text-sm"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3 md:space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} {...msg} />
            ))}
          </div>
          
          {loading && (
            <div className="flex justify-start mb-4">
              <Card className="bg-muted p-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </Card>
            </div>
          )}
        </ScrollArea>
        
        <div className="p-3 md:p-4 border-t border-border bg-card/50">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
              placeholder={
                language === 'hindi'
                  ? 'अपना प्रश्न पूछें...'
                  : 'Ask your question...'
              }
              disabled={loading}
              className="text-sm md:text-base border-input focus-visible:ring-primary"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 hidden sm:block">
            {language === 'hindi' 
              ? 'प्रश्न पूछें और स्रोत संदर्भ के साथ उत्तर प्राप्त करें'
              : 'Ask questions and get answers with source references'}
          </p>
        </div>
      </Card>
    </div>
  );
}