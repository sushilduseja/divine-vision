import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/search/hybridSearch';

export async function POST(req: NextRequest) {
  try {
    const { query, source = 'all', limit = 20, weights } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    const results = await hybridSearch({
      query,
      source,
      limit,
      weights: weights || { semantic: 0.6, keyword: 0.3, concept: 0.1 }
    });
    
    return NextResponse.json({
      results,
      count: results.length
    });
    
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
