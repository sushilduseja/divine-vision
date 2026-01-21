// lib/search/hybridSearch.ts - FIXED (no embedding API calls)
import { SearchResult, SearchConfig, SourceType } from '@/types';
import { keywordSearch } from './keywordSearch';
import { conceptSearch } from './conceptSearch';

export async function hybridSearch(
  queryOrConfig: string | SearchConfig,
  source?: string,
  limit?: number,
  weights?: { semantic: number; keyword: number; concept: number }
): Promise<SearchResult[]> {
  let config: SearchConfig;
  
  if (typeof queryOrConfig === 'string') {
    config = {
      query: queryOrConfig,
      source: (source || 'all') as 'all' | SourceType,
      limit: limit || 20,
      weights: weights || { semantic: 0, keyword: 0.7, concept: 0.3 }
    };
  } else {
    config = queryOrConfig;
  }
  
  const { query, source: sourceFilter, limit: resultLimit, weights: searchWeights } = config;
  
  // Only use keyword and concept search (no API calls)
  const [keywordResults, conceptResults] = await Promise.all([
    keywordSearch(query, sourceFilter, resultLimit * 2),
    conceptSearch(query, sourceFilter, resultLimit * 2)
  ]);
  
  // Combine with weighted RRF
  const combined = reciprocalRankFusion(
    keywordResults,
    conceptResults,
    searchWeights,
    60
  );
  
  return combined.slice(0, resultLimit);
}

function reciprocalRankFusion(
  keywordResults: SearchResult[],
  conceptResults: SearchResult[],
  weights: { semantic: number; keyword: number; concept: number },
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, { verse: SearchResult; score: number; types: Set<string> }>();
  
  // Score keyword results
  keywordResults.forEach((verse, rank) => {
    const score = (1 / (k + rank + 1)) * (weights.keyword + weights.semantic); // Combine semantic weight into keyword
    const existing = scoreMap.get(verse.text_id);
    
    if (existing) {
      existing.score += score;
      existing.types.add('keyword');
    } else {
      scoreMap.set(verse.text_id, {
        verse,
        score,
        types: new Set(['keyword'])
      });
    }
  });
  
  // Add concept results
  conceptResults.forEach((verse, rank) => {
    const score = (1 / (k + rank + 1)) * weights.concept;
    const existing = scoreMap.get(verse.text_id);
    
    if (existing) {
      existing.score += score;
      existing.types.add('concept');
    } else {
      scoreMap.set(verse.text_id, { verse, score, types: new Set(['concept']) });
    }
  });
  
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.verse,
      relevance_score: item.score,
      match_type: item.types.has('keyword') ? 'keyword' as const : 'concept' as const
    }));
}