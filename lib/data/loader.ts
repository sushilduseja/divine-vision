import { Verse } from '@/types';
import mockVerses from '@/data/mock-verses.json';

let cachedVerses: Verse[] | null = null;

export async function loadVerses(): Promise<Verse[]> {
  if (cachedVerses) return cachedVerses;
  
  // In production, this would load from /data/verses.json
  // For development, use mock data
  try {
    // If real data exists
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

export function clearCache() {
  cachedVerses = null;
}
