import { SearchResult, Verse } from '@/types';
import { loadVerses } from '@/lib/data/loader';

function fuzzyMatch(query: string, concept: string): number {
  const queryLower = query.toLowerCase();
  const conceptLower = concept.toLowerCase();
  
  // Exact match
  if (conceptLower === queryLower) return 1.0;
  
  // Contains match
  if (conceptLower.includes(queryLower) || queryLower.includes(conceptLower)) {
    return 0.8;
  }
  
  // Word boundary match
  const queryWords = queryLower.split(/\s+/);
  const conceptWords = conceptLower.split(/\s+/);
  const matchingWords = queryWords.filter(qw => 
    conceptWords.some(cw => cw.includes(qw) || qw.includes(cw))
  );
  
  if (matchingWords.length > 0) {
    return 0.6 * (matchingWords.length / queryWords.length);
  }
  
  // Character similarity (simple Levenshtein-like)
  let matches = 0;
  const minLen = Math.min(queryLower.length, conceptLower.length);
  for (let i = 0; i < minLen; i++) {
    if (queryLower[i] === conceptLower[i]) matches++;
  }
  
  return matches > 0 ? 0.3 * (matches / minLen) : 0;
}

export async function conceptSearch(
  query: string,
  source: string,
  limit: number
): Promise<SearchResult[]> {
  const verses = await loadVerses();
  const queryLower = query.toLowerCase();
  const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);
  
  const filtered = verses.filter(v => 
    source === 'all' || v.source === source
  );
  
  if (filtered.length === 0) return [];
  
  const results = filtered.map(verse => {
    let maxMatch = 0;
    const matchedConcepts: string[] = [];
    
    // Check each concept
    verse.concepts.forEach(concept => {
      const matchScore = fuzzyMatch(query, concept);
      if (matchScore > 0) {
        matchedConcepts.push(concept);
        maxMatch = Math.max(maxMatch, matchScore);
      }
    });
    
    // Also check keywords
    verse.keywords.forEach(keyword => {
      const matchScore = fuzzyMatch(query, keyword);
      if (matchScore > 0.5) {
        maxMatch = Math.max(maxMatch, matchScore * 0.7); // Keywords weighted less
      }
    });
    
    return {
      ...verse,
      similarity: 0,
      relevance_score: maxMatch,
      matched_concepts: matchedConcepts,
      match_type: 'concept' as const
    };
  });
  
  return results
    .filter(r => r.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}
