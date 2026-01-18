import { NextRequest, NextResponse } from 'next/server';
import { SearchResult } from '@/types';
import { generateResponse } from '@/lib/ai/models';

export async function POST(req: NextRequest) {
  try {
    const { query, results } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Results array is required' },
        { status: 400 }
      );
    }
    
    const prompt = `Rank these verses by relevance to the question: "${query}"

${results.map((v: SearchResult, i: number) => {
  const translation = v.translations.english.text;
  return `${i + 1}. ${v.text_id}: ${translation.slice(0, 150)}...`;
}).join('\n')}

Return ONLY a JSON array of indices (1-based) in descending order of relevance. Example: [3, 1, 5, 2, 4]`;

    try {
      const response = await generateResponse(
        prompt,
        'You are a Sanskrit expert. Return only a JSON array of numbers.',
        { temperature: 0.2, maxOutputTokens: 500 }
      );
      
      // Extract JSON array from response
      const jsonMatch = response.match(/\[[\d,\s]+\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }
      
      const rankings: number[] = JSON.parse(jsonMatch[0]);
      
      // Map rankings back to results
      const reranked = rankings
        .map((idx: number) => results[idx - 1])
        .filter(Boolean) as SearchResult[];
      
      // Add any results not in rankings at the end
      const rankedIds = new Set(rankings);
      const unranked = results.filter((_: SearchResult, idx: number) => 
        !rankedIds.has(idx + 1)
      );
      
      return NextResponse.json({
        results: [...reranked, ...unranked]
      });
      
    } catch (error) {
      console.error('Reranking failed, returning original order:', error);
      return NextResponse.json({
        results: results
      });
    }
    
  } catch (error: any) {
    console.error('Rerank error:', error);
    return NextResponse.json(
      { error: error.message || 'Reranking failed' },
      { status: 500 }
    );
  }
}
