// lib/search/vectorSearch.ts - FIXED
import { SearchResult, Verse } from '@/types';
import { loadVerses } from '@/lib/data/loader';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// Simple hash-based embedding that considers text content
function generateSimpleEmbedding(text: string, dim: number = 768): number[] {
  const embedding = new Array(dim).fill(0);
  const textLower = text.toLowerCase();
  
  // Create embedding based on character distribution
  for (let i = 0; i < textLower.length; i++) {
    const charCode = textLower.charCodeAt(i);
    const idx = (charCode * (i + 1)) % dim;
    embedding[idx] += Math.sin(charCode + i) * 0.1;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
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
  
  const results = filtered.map(verse => {
    // Generate embedding from verse content
    const verseText = `${verse.sanskrit.iast} ${verse.translations.english.text} ${verse.concepts.join(' ')}`;
    const embedding = generateSimpleEmbedding(verseText);
    
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    
    return {
      ...verse,
      similarity,
      relevance_score: similarity,
      matched_concepts: []
    };
  });
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}