import { SearchResult, SearchConfig, SourceType } from '@/types';
import { vectorSearch } from './vectorSearch';
import { keywordSearch } from './keywordSearch';
import { conceptSearch } from './conceptSearch';
import { generateEmbedding } from '@/lib/ai';

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
      weights: weights || { semantic: 0.6, keyword: 0.3, concept: 0.1 }
    };
  } else {
    config = queryOrConfig;
  }
  
  const { query, source: sourceFilter, limit: resultLimit, weights: searchWeights } = config;
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Parallel search: semantic, keyword, and concept
  const [vectorResults, keywordResults, conceptResults] = await Promise.all([
    vectorSearch(queryEmbedding, sourceFilter, resultLimit * 2),
    keywordSearch(query, sourceFilter, resultLimit * 2),
    conceptSearch(query, sourceFilter, resultLimit * 2)
  ]);
  
  // Combine with weighted RRF (Reciprocal Rank Fusion)
  const combined = reciprocalRankFusion(
    vectorResults,
    keywordResults,
    conceptResults,
    searchWeights,
    60 // k parameter
  );
  
  return combined.slice(0, resultLimit);
}

function reciprocalRankFusion(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  conceptResults: SearchResult[],
  weights: { semantic: number; keyword: number; concept: number },
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, { verse: SearchResult; score: number; types: Set<string> }>();
  
  // Score vector results
  vectorResults.forEach((verse, rank) => {
    const score = (1 / (k + rank + 1)) * weights.semantic;
    const existing = scoreMap.get(verse.text_id);
    
    if (existing) {
      existing.score += score;
      existing.types.add('semantic');
    } else {
      scoreMap.set(verse.text_id, {
        verse,
        score,
        types: new Set(['semantic'])
      });
    }
  });
  
  // Add keyword results
  keywordResults.forEach((verse, rank) => {
    const score = (1 / (k + rank + 1)) * weights.keyword;
    const existing = scoreMap.get(verse.text_id);
    
    if (existing) {
      existing.score += score;
      existing.types.add('keyword');
    } else {
      scoreMap.set(verse.text_id, { verse, score, types: new Set(['keyword']) });
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
  
  // Determine dominant match type
  const determineMatchType = (types: Set<string>): 'semantic' | 'keyword' | 'concept' => {
    if (types.has('semantic') && types.size === 1) return 'semantic';
    if (types.has('keyword') && types.size === 1) return 'keyword';
    if (types.has('concept') && types.size === 1) return 'concept';
    return 'semantic'; // Default
  };
  
  // Sort by combined score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.verse,
      relevance_score: item.score,
      match_type: determineMatchType(item.types)
    }));
}
