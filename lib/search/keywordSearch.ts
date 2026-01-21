// lib/search/keywordSearch.ts - ENHANCED (better BM25)
import { SearchResult, Verse } from '@/types';
import { loadVerses } from '@/lib/data/loader';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function calculateIDF(term: string, docs: Verse[]): number {
  const docsWithTerm = docs.filter(doc => {
    const docText = `${doc.sanskrit.iast} ${doc.translations.english.text} ${doc.concepts.join(' ')}`;
    return tokenize(docText).includes(term);
  }).length;
  
  return Math.log((docs.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
}

function bm25Score(
  queryTokens: string[],
  docTokens: string[],
  avgDocLength: number,
  idfScores: Map<string, number>,
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
      const idf = idfScores.get(token) || 0;
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
  
  // Calculate IDF scores for query terms
  const idfScores = new Map<string, number>();
  queryTokens.forEach(term => {
    idfScores.set(term, calculateIDF(term, filtered));
  });
  
  // Calculate average document length
  const avgDocLength = filtered.reduce((sum, v) => {
    const docText = `${v.sanskrit.iast} ${v.translations.english.text} ${v.concepts.join(' ')}`;
    return sum + tokenize(docText).length;
  }, 0) / filtered.length;
  
  // Score all documents
  const results = filtered.map(verse => {
    const docText = `${verse.sanskrit.iast} ${verse.translations.english.text} ${verse.concepts.join(' ')}`;
    const docTokens = tokenize(docText);
    const score = bm25Score(queryTokens, docTokens, avgDocLength, idfScores);
    
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
    .filter(r => r.relevance_score > 0)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, limit);
}