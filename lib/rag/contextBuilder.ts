import { SearchResult } from '@/types';
import { hybridSearch } from '@/lib/search/hybridSearch';
import { rerankResults } from '@/lib/search/reranker';

export async function buildContext(
  query: string,
  language: 'english' | 'hindi'
): Promise<{ context: string; sources: SearchResult[] }> {
  // Direct hybrid search (query decomposition is overkill for this domain)
  const results = await hybridSearch(query, 'all', 10);
  
  // Re-rank using LLM for better relevance
  const reranked = await rerankResults(query, results);
  const topResults = reranked.slice(0, 8);
  
  // Build context string
  const context = topResults.map((verse, idx) => {
    const translation = language === 'hindi' 
      ? verse.hindi_translation 
      : verse.english_translation;
    const commentary = language === 'hindi'
      ? verse.commentary_hindi
      : verse.commentary_english;
    
    return `[${idx + 1}] ${verse.text_id}
Sanskrit: ${verse.sanskrit_iast}
Translation: ${translation}
Commentary: ${commentary}
Concepts: ${verse.concepts.join(', ')}`;
  }).join('\n\n---\n\n');
  
  return { context, sources: topResults };
}
