import { SearchResult, Verse } from '@/types';
import { loadVerses, loadEmbeddings, getChunkId } from '@/lib/data/loader';

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

export async function vectorSearch(
  queryEmbedding: number[],
  source: string,
  limit: number
): Promise<SearchResult[]> {
  const verses = await loadVerses();
  
  const filtered = verses.filter(v => 
    source === 'all' || v.source === source
  );
  
  // For now, use mock embeddings if available
  // In production, load from separate embedding files
  const results = await Promise.all(
    filtered.map(async (verse) => {
      let embedding: number[] = [];
      
      // Try to load embedding from chunk
      if (verse.embedding_ref) {
        const chunkId = verse.embedding_ref.split('#')[0];
        const embeddingData = await loadEmbeddings(chunkId);
        if (embeddingData) {
          const verseIndex = parseInt(verse.embedding_ref.split('#')[1] || '0');
          embedding = embeddingData.embeddings[verseIndex] || [];
        }
      }
      
      // Fallback: generate a simple hash-based embedding for mock data
      if (embedding.length === 0) {
        // Create a simple embedding based on text_id hash
        embedding = Array.from({ length: 768 }, (_, i) => {
          const hash = (verse.text_id + i).split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
          }, 0);
          return (hash % 200 - 100) / 100;
        });
      }
      
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      
      return {
        ...verse,
        similarity,
        relevance_score: similarity,
        matched_concepts: []
      };
    })
  );
  
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
