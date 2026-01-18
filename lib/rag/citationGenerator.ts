import { SearchResult } from '@/types';

export function formatVerseReference(verse: SearchResult): string {
  if (verse.source === 'bhagavatam') {
    return `Śrīmad-Bhāgavatam ${verse.canto}.${verse.chapter}.${verse.verse_number}`;
  } else if (verse.source === 'vishnu_sahasranam') {
    return `Viṣṇu Sahasranāma, verse ${verse.verse_number}`;
  } else if (verse.source === 'lalita_sahasranam') {
    return `Lalitā Sahasranāma, verse ${verse.verse_number}`;
  }
  return verse.text_id;
}
