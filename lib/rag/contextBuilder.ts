// lib/rag/contextBuilder.ts - FIXED (simplified, no reranking)
import { SearchResult, Language } from '@/types';
import { hybridSearch } from '@/lib/search/hybridSearch';
import { CONTEXT_TEMPLATES } from '@/lib/ai/prompts';

export interface BuildContextOptions {
  template?: 'verse_analysis' | 'comparative' | 'word_study';
  includeWordMeanings?: boolean;
  maxTokens?: number;
}

export async function buildContext(
  query: string,
  language: Language = 'english',
  options: BuildContextOptions = {}
): Promise<{ context: string; sources: SearchResult[] }> {
  const {
    template = 'verse_analysis',
    maxTokens = 6000
  } = options;

  // Search using keyword + concept only (no API calls)
  const results = await hybridSearch({
    query,
    source: 'all',
    limit: 8,
    weights: { semantic: 0, keyword: 0.7, concept: 0.3 }
  });
  
  // Take top results
  const topResults = results.slice(0, 5);
  
  // Build context using template
  const context = CONTEXT_TEMPLATES.verse_analysis(topResults, query, language);
  
  // Truncate if needed
  const maxChars = maxTokens * 4;
  if (context.length > maxChars) {
    return {
      context: context.slice(0, maxChars) + '...\n\n[Context truncated for length]',
      sources: topResults
    };
  }
  
  return { context, sources: topResults };
}