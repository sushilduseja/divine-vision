import { SearchResult } from '@/types';
import { loadVerses } from '@/lib/data/loader';

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function vectorSearch(
  queryEmbedding: number[],
  source: string,
  limit: number
): Promise<SearchResult[]> {
  const verses = await loadVerses();
  
  const filtered = verses.filter(v => 
    source === 'all' || v.source === source
  );
  
  const results = filtered.map(verse => ({
    ...verse,
    similarity: cosineSimilarity(queryEmbedding, verse.embedding),
    relevance_score: 0,
    matched_concepts: []
  }));
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
