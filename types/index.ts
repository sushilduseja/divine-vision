// types/index.ts

export type SourceType = 'bhagavatam' | 'vishnu_sahasranam' | 'lalita_sahasranam';
export type ChatMode = 'conversational' | 'scholarly' | 'beginner';
export type Language = 'english' | 'hindi';
export type ViewMode = 'compact' | 'detailed' | 'study';

export interface WordBreakdown {
  sanskrit: string;
  transliteration: string;
  meaning: string;
}

export interface SanskritData {
  devanagari: string;
  iast: string;
  word_breakdown?: WordBreakdown[];
}

export interface Translation {
  text: string;
  translator: string;
  purport?: string;
}

export interface Translations {
  english: Translation;
  hindi?: Translation;
}

export interface Verse {
  text_id: string;
  source: SourceType;
  canto?: number;
  chapter?: number;
  verse_number: number;
  sanskrit: SanskritData;
  translations: Translations;
  concepts: string[];
  keywords: string[];
  embedding_ref?: string;
  source_url: string;
  last_verified: string;
  copyright?: string;
}

export interface SearchResult extends Verse {
  similarity: number;
  relevance_score: number;
  matched_concepts: string[];
  match_type?: 'semantic' | 'keyword' | 'concept';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ text_id: string; translation: string; relevance?: number }>;
  timestamp: number;
  metadata?: {
    verses_used?: number;
    mode?: ChatMode;
    has_disclaimer?: boolean;
  };
}

export interface EmbeddingData {
  chunk_id: string;
  embeddings: number[][];
  verse_ids: string[];
  model: string;
  created_at: string;
}

export interface Metadata {
  version: string;
  total_verses: number;
  sources: {
    bhagavatam: { cantos: number; chapters: number; verses: number };
    vishnu_sahasranam: { verses: number };
    lalita_sahasranam: { verses: number };
  };
  last_updated: string;
  data_integrity_hash: string;
}

export interface VerseChunk {
  chunk_id: string;
  source: SourceType;
  canto?: number;
  chapter?: number;
  verses: Verse[];
}

export interface SearchConfig {
  query: string;
  source: 'all' | SourceType;
  limit: number;
  weights: {
    semantic: number;
    keyword: number;
    concept: number;
  };
}
