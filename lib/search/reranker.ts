import { SearchResult } from '@/types';
import { generateResponse } from '@/lib/ai';

export async function rerankResults(
  query: string,
  results: SearchResult[]
): Promise<SearchResult[]> {
  if (results.length === 0) return results;
  
  const prompt = `Rank these verses by relevance to the question: "${query}"

${results.map((v, i) => `${i + 1}. ${v.text_id}: ${v.english_translation.slice(0, 100)}...`).join('\n')}

Return ONLY a JSON array of indices in descending order of relevance. Example: [3, 1, 5, 2, 4]`;

  try {
    const response = await generateResponse(prompt, 'You are a Sanskrit expert.');
    const rankings = JSON.parse(response);
    
    return rankings.map((idx: number) => results[idx - 1]).filter(Boolean);
  } catch (error) {
    console.error('Reranking failed, returning original order:', error);
    return results;
  }
}
