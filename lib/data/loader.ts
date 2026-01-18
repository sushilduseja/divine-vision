import { Verse, EmbeddingData, Metadata, VerseChunk, SourceType } from '@/types';
import { getCached, setCached } from './cache';
import mockVerses from '@/data/mock-verses.json';

const CACHE_VERSION = 'v1';

let cachedVerses: Verse[] | null = null;
let cachedMetadata: Metadata | null = null;

function getChunkId(source: SourceType, canto?: number, chapter?: number): string {
  if (source === 'bhagavatam' && canto && chapter) {
    return `${source}-${canto}-${chapter}`;
  }
  return source;
}

export async function loadMetadata(): Promise<Metadata | null> {
  if (cachedMetadata) return cachedMetadata;
  
  const cacheKey = `metadata_${CACHE_VERSION}`;
  const cached = getCached<Metadata>(cacheKey);
  if (cached) {
    cachedMetadata = cached;
    return cached;
  }
  
  try {
    const response = await fetch('/data/metadata.json');
    if (response.ok) {
      const data = await response.json() as Metadata;
      setCached(cacheKey, data, 86400); // 24 hours
      cachedMetadata = data;
      return data;
    }
  } catch {
    // Fall back to null
  }
  
  return null;
}

export async function loadVerseChunk(
  source: SourceType,
  chunkId: string
): Promise<Verse[]> {
  const cacheKey = `verses_${source}_${chunkId}_${CACHE_VERSION}`;
  const cached = getCached<Verse[]>(cacheKey);
  if (cached) return cached;
  
  try {
    const path = source === 'bhagavatam'
      ? `/data/verses/bhagavatam/${chunkId}.json`
      : `/data/verses/${source}.json`;
    
    const response = await fetch(path);
    if (response.ok) {
      let data: Verse[] | VerseChunk;
      
      // Check if response is gzipped
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('gzip')) {
        // For now, assume JSON - in production would decompress
        data = await response.json();
      } else {
        data = await response.json();
      }
      
      const verses = 'verses' in data ? data.verses : (data as Verse[]);
      setCached(cacheKey, verses, 86400); // 24 hours
      return verses;
    }
  } catch (error) {
    console.warn(`Failed to load chunk ${chunkId}:`, error);
  }
  
  // Fall back to mock data for development
  if (typeof window !== 'undefined') {
    const mock = mockVerses as unknown as Verse[];
    return mock.filter(v => v.source === source);
  }
  
  return [];
}

export async function loadEmbeddings(chunkId: string): Promise<EmbeddingData | null> {
  const cacheKey = `embeddings_${chunkId}_${CACHE_VERSION}`;
  const cached = getCached<EmbeddingData>(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await fetch(`/data/embeddings/${chunkId}.json`);
    if (response.ok) {
      const data = await response.json() as EmbeddingData;
      setCached(cacheKey, data, 86400);
      return data;
    }
  } catch {
    // Embeddings not available
  }
  
  return null;
}

export async function loadVerses(): Promise<Verse[]> {
  if (cachedVerses) return cachedVerses;
  
  // Try to load all chunks (for backward compatibility)
  try {
    const response = await fetch('/data/verses.json');
    if (response.ok) {
      const data = await response.json();
      cachedVerses = data as Verse[];
      return cachedVerses;
    }
  } catch {
    // Fall back to mock data
  }
  
  cachedVerses = mockVerses as unknown as Verse[];
  return cachedVerses;
}

export async function loadVersesBySource(source: SourceType): Promise<Verse[]> {
  const chunkId = getChunkId(source);
  return loadVerseChunk(source, chunkId);
}

export function clearCache() {
  cachedVerses = null;
  cachedMetadata = null;
  if (typeof window !== 'undefined') {
    localStorage.clear();
  }
}

export { getChunkId };
