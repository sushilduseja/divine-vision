import { SearchResult } from '@/types';
import { loadVerses } from '@/lib/data/loader';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLength: number,
  k1: number = 1.5,
  b: number = 0.75
): number {
  const docLength = docTokens.length;
  const tokenFreq = new Map<string, number>();
  
  docTokens.forEach(token => {
    tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
  });
  
  let score = 0;
  queryTokens.forEach(token => {
    const freq = tokenFreq.get(token) || 0;
    if (freq > 0) {
      const idf = Math.log((1 + 1) / (1 + freq));
      const tf = (freq * (k1 + 1)) / 
                 (freq + k1 * (1 - b + b * (docLength / avgDocLength)));
      score += idf * tf;
    }
  });
  
  return score;
}

export async function keywordSearch(
  query: string,
  source: string,
  limit: number
): Promise<SearchResult[]> {
  const verses = await loadVerses();
  const queryTokens = tokenize(query);
  
  const filtered = verses.filter(v => 
    source === 'all' || v.source === source
  );
  
  if (filtered.length === 0) return [];
  
  const avgDocLength = filtered.reduce(
    (sum, v) => sum + tokenize(v.english_translation + ' ' + v.sanskrit_iast).length,
    0
  ) / filtered.length;
  
  const results = filtered.map(verse => {
    const docText = `${verse.sanskrit_iast} ${verse.english_translation} ${verse.concepts.join(' ')}`;
    const docTokens = tokenize(docText);
    const score = bm25Score(queryTokens, docTokens, avgDocLength);
    
    return {
      ...verse,
      similarity: 0,
      relevance_score: score,
      matched_concepts: verse.concepts.filter(c => 
        queryTokens.some(t => c.toLowerCase().includes(t))
      )
    };
  });
  
  return results
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}
