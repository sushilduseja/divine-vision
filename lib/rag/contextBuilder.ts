import { SearchResult, Language } from '@/types';
import { hybridSearch } from '@/lib/search/hybridSearch';
import { rerankResults } from '@/lib/search/reranker';
import { CONTEXT_TEMPLATES } from '@/lib/ai/prompts';

export interface BuildContextOptions {
  template?: 'verse_analysis' | 'comparative' | 'word_study';
  includeWordMeanings?: boolean;
  maxTokens?: number;
  useReranking?: boolean;
}

export async function buildContext(
  query: string,
  language: Language = 'english',
  options: BuildContextOptions = {}
): Promise<{ context: string; sources: SearchResult[] }> {
  const {
    template = 'verse_analysis',
    includeWordMeanings = true,
    maxTokens = 6000,
    useReranking = true
  } = options;

  // Direct hybrid search with configurable weights
  const results = await hybridSearch({
    query,
    source: 'all',
    limit: 10,
    weights: { semantic: 0.6, keyword: 0.3, concept: 0.1 }
  });
  
  // Re-rank using LLM for better relevance (optional)
  let topResults = results;
  if (useReranking && results.length > 0) {
    try {
      const reranked = await rerankResults(query, results);
      topResults = reranked.slice(0, 8);
    } catch (error) {
      console.warn('Reranking failed, using original results:', error);
      topResults = results.slice(0, 8);
    }
  } else {
    topResults = results.slice(0, 8);
  }
  
  // Build context using appropriate template
  let context: string;
  
  if (template === 'verse_analysis') {
    context = CONTEXT_TEMPLATES.verse_analysis(topResults, query, language);
  } else if (template === 'comparative') {
    // Extract theme from query (simple heuristic)
    const theme = query.split(/about|regarding|on/i)[1]?.trim() || query;
    context = CONTEXT_TEMPLATES.comparative(topResults, theme, language);
  } else if (template === 'word_study') {
    // Extract Sanskrit term from query (simple heuristic)
    const sanskritTerm = query.split(/meaning|definition|what is/i)[1]?.trim() || query;
    context = CONTEXT_TEMPLATES.word_study(sanskritTerm, topResults, language);
  } else {
    // Default to verse_analysis
    context = CONTEXT_TEMPLATES.verse_analysis(topResults, query, language);
  }
  
  // Truncate if exceeds max tokens (rough estimate: 1 token ≈ 4 characters)
  const maxChars = maxTokens * 4;
  if (context.length > maxChars) {
    context = context.slice(0, maxChars) + '...\n\n[Context truncated for length]';
  }
  
  return { context, sources: topResults };
}
