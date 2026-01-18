// types/index.ts
export interface Verse {
  text_id: string;
  source: 'bhagavatam' | 'vishnu_sahasranam' | 'lalita_sahasranam';
  canto?: number;
  chapter?: number;
  verse_number: number;
  sanskrit_devanagari: string;
  sanskrit_iast: string;
  english_translation: string;
  hindi_translation: string;
  word_meanings: Record<string, string>;
  commentary_english: string;
  commentary_hindi: string;
  concepts: string[];
  embedding: number[];
  keywords: string[];
}

export interface SearchResult extends Verse {
  similarity: number;
  relevance_score: number;
  matched_concepts: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ text_id: string; translation: string }>;
  timestamp: number;
}
