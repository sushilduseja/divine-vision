import { Verse, SearchResult } from '@/types';
import { vectorSearch } from './vectorSearch';
import { keywordSearch } from './keywordSearch';
import { generateEmbedding } from '@/lib/ai';

export async function hybridSearch(
  query: string,
  source: string = 'all',
  limit: number = 20
): Promise<SearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Vector search (semantic)
  const vectorResults = await vectorSearch(queryEmbedding, source, limit * 2);
  
  // Keyword search (lexical)
  const keywordResults = await keywordSearch(query, source, limit * 2);
  
  // Combine with RRF (Reciprocal Rank Fusion)
  const combined = reciprocalRankFusion(
    vectorResults,
    keywordResults,
    60 // k parameter
  );
  
  return combined.slice(0, limit);
}

function reciprocalRankFusion(
  vectorResults: SearchResult[],
  keywordResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, { verse: SearchResult; score: number }>();
  
  // Score vector results
  vectorResults.forEach((verse, rank) => {
    const score = 1 / (k + rank + 1);
    scoreMap.set(verse.text_id, {
      verse,
      score
    });
  });
  
  // Add keyword results
  keywordResults.forEach((verse, rank) => {
    const score = 1 / (k + rank + 1);
    const existing = scoreMap.get(verse.text_id);
    
    if (existing) {
      existing.score += score;
    } else {
      scoreMap.set(verse.text_id, { verse, score });
    }
  });
  
  // Sort by combined score
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      ...item.verse,
      relevance_score: item.score
    }));
}
