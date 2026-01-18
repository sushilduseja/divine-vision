import { NextRequest, NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/search/hybridSearch';

export async function POST(req: NextRequest) {
  try {
    const { query, source = 'all', limit = 20 } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    const results = await hybridSearch(query, source, limit);
    
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
