// components/ChatMessage.tsx - FIXED (show fallback notice)
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { marked } from 'marked';
import { useMemo } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ text_id: string; translation: string }>;
  timestamp: number;
  metadata?: {
    fallback_used?: boolean;
  };
}

export function ChatMessage({ role, content, sources, timestamp, metadata }: ChatMessageProps) {
  const htmlContent = useMemo(() => {
    if (role === 'assistant') {
      return marked.parse(content);
    }
    return content;
  }, [content, role]);
  
  const isFallback = metadata?.fallback_used || content.includes('temporarily unavailable');
  
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="max-w-[85%] space-y-2">
        {isFallback && role === 'assistant' && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
              AI service temporarily limited. Showing direct verse translations.
            </AlertDescription>
          </Alert>
        )}
        
        <Card className={`${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          <div className="p-4">
            {role === 'assistant' ? (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            ) : (
              <p className="whitespace-pre-wrap">{content}</p>
            )}
            
            {sources && sources.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-xs font-semibold opacity-70">Sources:</p>
                {sources.map((source, idx) => (
                  <div key={idx} className="text-xs opacity-80">
                    <Badge variant="outline" className="mr-2">{source.text_id}</Badge>
                    <span>{source.translation.slice(0, 100)}...</span>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs opacity-50 mt-2">
              {new Date(timestamp).toLocaleTimeString()}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}