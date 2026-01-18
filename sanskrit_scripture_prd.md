# Divine Vision - Enterprise Product Requirements Document v3.0

## 1. Executive Summary

**Vision**: Enterprise-grade web application for exploring sacred Hindu texts (Śrīmad-Bhāgavatam, Viṣṇu Sahasranāma, Lalitā Sahasranāma) with semantic search, AI-powered Q&A, and scholarly accuracy.

**Platform**: Vercel (serverless)  
**Data Sources**: vedabase.io (primary), sanskritdocuments.org (secondary), archive.org (validation)  
**Core Principle**: Self-contained, accurate, respectful, performant

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              Vercel Edge Network (CDN)              │
│  • Pre-rendered pages (ISR)                         │
│  • Static JSON data (chunked, compressed)           │
│  • Pre-computed embeddings                          │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│           Next.js 14 App (Serverless)               │
│  • Server Components (data loading)                 │
│  • Client Components (interactivity)                │
│  • API Routes (chat, analytics)                     │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌──────────────────┐          ┌──────────────────────┐
│  Static Data     │          │  Google Gemini API   │
│  • verses.json   │          │  • Chat completion   │
│  • embeddings/*  │          │  • Context-aware Q&A │
│  • metadata.json │          │  • Rate limited      │
└──────────────────┘          └──────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│           Client-Side Intelligence                  │
│  • In-memory vector search (WASM-optimized)        │
│  • localStorage (bookmarks, preferences)            │
│  • IndexedDB (full-text search index)               │
└─────────────────────────────────────────────────────┘
```

**Key Design Decisions**:
1. **No external database**: All data pre-baked into static JSON files
2. **Build-time embedding**: Embeddings computed once during build, stored as JSON
3. **Client-side vector search**: Fast, no API calls, works offline after first load
4. **Chunked data loading**: Load verses on-demand (lazy loading)
5. **Gemini for chat only**: Reduces API usage, preserves free tier

---

## 3. Data Pipeline

### 3.1 Source Selection & Scraping

**Primary Source**: vedabase.io/en/library/sb/
- **Why**: Scholarly translations by A.C. Bhaktivedanta Swami Prabhupada, word-for-word synonyms, detailed purports
- **What to scrape**: Sanskrit (Devanagari + IAST), English translation, purports, verse metadata

**Secondary Source**: sanskritdocuments.org
- **Why**: Comprehensive Devanagari text for Sahasranāmas
- **What to scrape**: Vishnu Sahasranāma, Lalitā Sahasranāma (Sanskrit + basic translations)

**Validation Source**: archive.org (Digital Library of India)
- **Why**: Cross-reference historical editions
- **What to validate**: Verse counts, critical variant readings

### 3.2 Data Schema

```typescript
// public/data/verses/bhagavatam-1-1.json (chunked by canto-chapter)
interface VerseData {
  text_id: string;              // "SB.1.1.1"
  source: "bhagavatam" | "vishnu_sahasranam" | "lalita_sahasranam";
  canto?: number;
  chapter?: number;
  verse_number: number;
  
  // Sanskrit
  sanskrit: {
    devanagari: string;
    iast: string;               // International Alphabet of Sanskrit Transliteration
    word_breakdown?: Array<{    // Word-for-word from Vedabase
      sanskrit: string;
      transliteration: string;
      meaning: string;
    }>;
  };
  
  // Translations
  translations: {
    english: {
      text: string;
      translator: string;       // "A.C. Bhaktivedanta Swami Prabhupada"
      purport?: string;          // Commentary
    };
    hindi?: {
      text: string;
      translator: string;
    };
  };
  
  // Metadata
  concepts: string[];           // ["devotion", "krishna", "dharma"]
  keywords: string[];           // For BM25 search
  embedding_ref: string;        // "embeddings/sb-1-1.json#0"
  
  // Source tracking
  source_url: string;
  last_verified: string;        // ISO date
}

// public/data/embeddings/sb-1-1.json (chunked)
interface EmbeddingData {
  chunk_id: string;             // "sb-1-1"
  embeddings: number[][];       // Array of 768-dim vectors
  verse_ids: string[];          // Corresponding verse IDs
  model: "text-embedding-004";
  created_at: string;
}

// public/data/metadata.json
interface Metadata {
  version: string;
  total_verses: number;
  sources: {
    bhagavatam: { cantos: 12; chapters: 335; verses: 18000 };
    vishnu_sahasranam: { verses: 1000 };
    lalita_sahasranam: { verses: 1000 };
  };
  last_updated: string;
  data_integrity_hash: string;
}
```

### 3.3 Build-Time Data Processing

```bash
# scripts/build-data.sh
#!/bin/bash

# 1. Scrape from sources
npm run scrape:vedabase      # ~2 hours (respectful rate limiting)
npm run scrape:sahasranamas  # ~30 min

# 2. Validate & normalize
npm run validate:data        # Check verse counts, formatting

# 3. Generate embeddings (one-time cost)
npm run embed:all            # Uses Gemini text-embedding-004
                             # Batch process: 50 verses/min
                             # Total time: ~7 hours for 20K verses
                             # Cost: ~$0 (within free tier)

# 4. Generate search indices
npm run index:build          # BM25 index for keyword search

# 5. Chunk & compress
npm run chunk:data           # Split into ~100 KB chunks
npm run compress:json        # Gzip compression
```

**Output Structure**:
```
public/data/
├── metadata.json                    # 2 KB
├── verses/
│   ├── bhagavatam/
│   │   ├── 1-1.json.gz             # Canto 1, Chapter 1 (~50 KB)
│   │   ├── 1-2.json.gz
│   │   └── ... (335 files)
│   ├── vishnu-sahasranam.json.gz   # ~150 KB
│   └── lalita-sahasranam.json.gz   # ~150 KB
├── embeddings/
│   ├── bhagavatam/
│   │   ├── 1-1.bin                 # Binary format (smaller)
│   │   └── ... (335 files)
│   ├── vishnu-sahasranam.bin
│   └── lalita-sahasranam.bin
└── search-index.json.gz            # BM25 index (~500 KB)
```

---

## 4. Search Architecture

### 4.1 Hybrid Search Implementation

```typescript
// lib/search/hybrid.ts
import { cosineSimilarity } from '@/lib/vector-utils';
import { bm25Search } from '@/lib/search/bm25';

interface SearchConfig {
  query: string;
  source: 'all' | 'bhagavatam' | 'vishnu_sahasranam' | 'lalita_sahasranam';
  limit: number;
  weights: {
    semantic: number;  // 0-1
    keyword: number;   // 0-1
    concept: number;   // 0-1
  };
}

export async function hybridSearch(config: SearchConfig) {
  const { query, source, limit, weights } = config;
  
  // 1. Load relevant embeddings (lazy)
  const embeddings = await loadEmbeddings(source);
  
  // 2. Generate query embedding (client-side using pre-loaded model)
  const queryEmbedding = await generateEmbedding(query);
  
  // 3. Semantic search (vector similarity)
  const semanticResults = embeddings.map((emb, idx) => ({
    idx,
    score: cosineSimilarity(queryEmbedding, emb) * weights.semantic
  }));
  
  // 4. Keyword search (BM25)
  const keywordResults = bm25Search(query, source, limit * 2);
  
  // 5. Concept matching (exact + fuzzy)
  const conceptResults = conceptMatch(query, source);
  
  // 6. Reciprocal Rank Fusion
  const fused = reciprocalRankFusion([
    semanticResults,
    keywordResults.map(r => ({ idx: r.idx, score: r.bm25 * weights.keyword })),
    conceptResults.map(r => ({ idx: r.idx, score: r.match * weights.concept }))
  ]);
  
  // 7. Load full verse data for top results
  const topIndices = fused.slice(0, limit).map(r => r.idx);
  const verses = await loadVerses(topIndices, source);
  
  return verses.map((v, i) => ({
    ...v,
    relevance_score: fused[i].score,
    match_type: fused[i].dominantType // 'semantic', 'keyword', or 'concept'
  }));
}
```

### 4.2 Client-Side Embedding (WASM-Optimized)

**Problem**: Gemini API has rate limits (1500 req/day). Can't generate embeddings for every search query.

**Solution**: Use a lightweight embedding model that runs client-side.

```typescript
// lib/embeddings/client-model.ts
import * as ort from 'onnxruntime-web';

let model: ort.InferenceSession | null = null;

export async function initEmbeddingModel() {
  if (model) return;
  
  // Use a quantized ONNX model (~10 MB)
  // Options: all-MiniLM-L6-v2 (384-dim), gte-small (384-dim)
  model = await ort.InferenceSession.create('/models/gte-small-quantized.onnx');
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!model) await initEmbeddingModel();
  
  // Tokenize (simple BPE tokenizer)
  const tokens = tokenize(text, 128); // max length
  
  // Run inference
  const feeds = { input_ids: new ort.Tensor('int64', tokens, [1, tokens.length]) };
  const results = await model.run(feeds);
  
  // Extract embedding (mean pooling)
  const embedding = Array.from(results.last_hidden_state.data as Float32Array);
  return normalize(embedding);
}
```

**Alternative (Hybrid Approach)**:
- Pre-compute embeddings for common queries (top 1000 patterns)
- Cache in localStorage
- Fall back to Gemini API for novel queries (rate-limited)

---

## 5. AI Chat System

### 5.1 Context-Aware Prompting

```typescript
// lib/ai/prompts.ts

export const SYSTEM_PROMPTS = {
  base: `You are a learned guide to Hindu scriptures, specifically the Śrīmad-Bhāgavatam, Viṣṇu Sahasranāma, and Lalitā Sahasranāma. Your role is to help seekers understand these sacred texts with clarity, respect, and scholarly accuracy.

Core Principles:
1. **Accuracy**: Base answers ONLY on the provided verse context. Never fabricate information.
2. **Humility**: Acknowledge the limits of AI interpretation. Encourage consulting traditional teachers.
3. **Respect**: Treat these texts as sacred. Avoid reductionist or dismissive language.
4. **Clarity**: Explain complex philosophical concepts in accessible terms without oversimplification.
5. **Citations**: Always cite specific verses using the format [SB.1.1.1] or [VS.42].

Constraints:
- You do NOT have access to the entire corpus—only verses provided in the context.
- If a question cannot be answered from the given verses, say so clearly.
- Avoid mixing traditions (e.g., don't cite Buddhist sutras when discussing Vaishnava texts).
- When discussing deity forms or practices, note regional/sampradaya variations.`,

  conversational: `You are having a thoughtful dialogue with someone exploring Hindu scriptures. 

Tone Guidelines:
- Warm and encouraging, not preachy
- Use "we" and "one" instead of "you should"
- Ask clarifying questions when the query is ambiguous
- Acknowledge the seeker's spiritual journey with respect

Example:
❌ "You must practice bhakti to understand Krishna."
✅ "Many practitioners find that bhakti—loving devotion—opens deeper understanding of Krishna's nature. The Bhāgavatam emphasizes this in verses like [SB.11.14.21]."`,

  scholarly: `You are providing academic analysis of Hindu scriptures.

Approach:
- Use precise Sanskrit terminology (with transliteration)
- Reference commentarial traditions (Śrīdhara Svāmī, Viśvanātha Cakravartī, etc.)
- Acknowledge textual variants and interpretive debates
- Connect to broader Vedāntic or Purāṇic contexts

Citation style: "As Śrīdhara Svāmī comments on SB.1.1.1, the term 'dharma' here..."`,

  beginner: `You are introducing Hindu scriptures to someone new to this tradition.

Guidelines:
- Define Sanskrit terms on first use
- Use analogies from universal human experience
- Provide historical/cultural context
- Avoid assuming prior knowledge of Hindu cosmology

Example:
"The Bhāgavatam describes Krishna as the 'Supreme Personality of Godhead.' In Hindu theology, this means the ultimate reality that is both transcendent (beyond the universe) and personal (capable of relationship)."`
};

export const CONTEXT_TEMPLATES = {
  verse_analysis: (verses: Verse[], question: string) => `
Question: ${question}

Relevant Verses:
${verses.map((v, i) => `
[${i + 1}] ${v.text_id}
Sanskrit: ${v.sanskrit.iast}
Translation: ${v.translations.english.text}
${v.translations.english.purport ? `Commentary: ${v.translations.english.purport.slice(0, 500)}...` : ''}
Key Concepts: ${v.concepts.join(', ')}
`).join('\n---\n')}

Task: Provide a thoughtful answer that:
1. Directly addresses the question
2. Cites specific verses using [number] format
3. Explains the philosophical significance
4. Connects related ideas across verses (if applicable)
5. Ends with a reflection question to deepen understanding

Format your response in markdown with clear sections.`,

  comparative: (verses: Verse[], theme: string) => `
Theme: ${theme}

Verses for Comparison:
${verses.map((v, i) => `[${i + 1}] ${v.text_id}: "${v.translations.english.text.slice(0, 100)}..."`).join('\n')}

Task: Analyze how these verses approach "${theme}" from different angles. Highlight:
- Common threads
- Nuanced differences
- Progressive development of the idea
- Practical implications`,

  word_study: (word: string, verses: Verse[]) => `
Sanskrit Term: ${word}

Occurrences:
${verses.map((v, i) => {
  const wordData = v.sanskrit.word_breakdown?.find(w => 
    w.sanskrit.toLowerCase().includes(word.toLowerCase())
  );
  return `[${i + 1}] ${v.text_id}: "${wordData?.meaning || 'contextual use'}"`
}).join('\n')}

Task: Provide a mini-commentary on the term "${word}" including:
- Etymology (if known from context)
- Range of meanings across these verses
- How it relates to key concepts in the tradition
- Why this term matters philosophically`
};

export const SAFETY_PROMPTS = {
  disclaimer: `**Important Note**: This response is generated by an AI based on textual analysis. For authoritative guidance on practice, ritual, or spiritual matters, please consult qualified teachers in a traditional lineage (sampradāya). AI interpretations should not replace the wisdom of living gurus or the guidance of experienced practitioners.`,
  
  controversial: `This question touches on matters where interpretations vary across sampradāyas (theological schools) and commentators. I'll present the perspective offered by the verses provided, but recognize that other valid interpretations exist within the tradition.`,
  
  practice_warning: `The text describes practices that should be undertaken only under proper guidance. If you're interested in implementing these teachings, seek instruction from a qualified guru in an authentic lineage.`
};
```

### 5.2 Chat API Implementation

```typescript
// app/api/chat/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildContext } from '@/lib/ai/context-builder';
import { SYSTEM_PROMPTS, SAFETY_PROMPTS } from '@/lib/ai/prompts';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  const { message, history, mode = 'conversational', language = 'english' } = await req.json();
  
  // 1. Search for relevant verses
  const verses = await hybridSearch({
    query: message,
    source: 'all',
    limit: 8,
    weights: { semantic: 0.6, keyword: 0.3, concept: 0.1 }
  });
  
  // 2. Build context
  const context = buildContext(verses, message, {
    template: 'verse_analysis',
    includeWordMeanings: true,
    maxTokens: 6000
  });
  
  // 3. Determine if disclaimer needed
  const needsDisclaimer = detectSensitiveQuery(message);
  const needsControversy = detectControversialTopic(message);
  
  // 4. Construct prompt
  const systemPrompt = [
    SYSTEM_PROMPTS.base,
    SYSTEM_PROMPTS[mode],
    needsControversy ? SAFETY_PROMPTS.controversial : null
  ].filter(Boolean).join('\n\n');
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.4,        // Lower for accuracy
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
      candidateCount: 1
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  });
  
  // 5. Generate response
  const chat = model.startChat({
    history: history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))
  });
  
  const result = await chat.sendMessage(context);
  const response = result.response.text();
  
  // 6. Add disclaimer if needed
  const finalResponse = needsDisclaimer 
    ? `${response}\n\n---\n\n${SAFETY_PROMPTS.disclaimer}`
    : response;
  
  return Response.json({
    response: finalResponse,
    sources: verses.map(v => ({
      text_id: v.text_id,
      translation: v.translations.english.text,
      relevance: v.relevance_score
    })),
    metadata: {
      verses_used: verses.length,
      mode,
      has_disclaimer: needsDisclaimer
    }
  });
}

function detectSensitiveQuery(query: string): boolean {
  const patterns = [
    /how (do|should) (i|we) (perform|practice|do)/i,
    /ritual|puja|sadhana|mantra.*chant/i,
    /guru|initiation|diksha/i
  ];
  return patterns.some(p => p.test(query));
}

function detectControversialTopic(query: string): boolean {
  const topics = [
    /caste|varna.*system/i,
    /women.*role|gender/i,
    /violence|war|killing/i,
    /exclusive|only.*path/i
  ];
  return topics.some(t => t.test(query));
}
```

---

## 6. Enterprise UI/UX Design

### 6.1 Design System

```typescript
// Design tokens (Tailwind config extension)
export const designSystem = {
  colors: {
    primary: {
      50: '#faf5ff',   // Soft violet
      100: '#f3e8ff',
      500: '#a855f7',  // Rich purple
      600: '#9333ea',
      900: '#581c87'
    },
    sacred: {
      saffron: '#FF9933',
      lotus: '#E91E63',
      peacock: '#4DD0E1',
      sandalwood: '#FFEAA7'
    },
    semantic: {
      bhagavatam: '#9333ea',
      vishnu: '#3b82f6',
      lalita: '#ec4899'
    }
  },
  typography: {
    sanskrit: ['Noto Sans Devanagari', 'sans-serif'],
    body: ['Literata', 'Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace']
  },
  spacing: {
    section: '5rem',  // 80px
    card: '1.5rem',   // 24px
  },
  elevation: {
    card: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    cardHover: '0 4px 12px rgba(147, 51, 234, 0.15)',
    modal: '0 20px 40px rgba(0,0,0,0.3)'
  }
};
```

### 6.2 Component Architecture

```typescript
// components/VerseCard/VerseCard.tsx
interface VerseCardProps {
  verse: Verse;
  viewMode: 'compact' | 'detailed' | 'study';
  language: 'english' | 'hindi';
  showSanskrit: boolean;
  onBookmark?: () => void;
  onShare?: () => void;
  onCite?: () => void;
}

export function VerseCard({ verse, viewMode, language, showSanskrit }: VerseCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card className="verse-card group hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`source-badge ${verse.source}`}>
            {getSourceLabel(verse.source)}
          </Badge>
          <code className="text-sm font-mono text-muted-foreground">
            {verse.text_id}
          </code>
        </div>
        
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onBookmark}>
            <Bookmark className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onCite}>
            <Quote className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sanskrit (optional) */}
        {showSanskrit && (
          <div className="sanskrit-section bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <Tabs defaultValue="devanagari">
              <TabsList>
                <TabsTrigger value="devanagari">देवनागरी</TabsTrigger>
                <TabsTrigger value="iast">IAST</TabsTrigger>
                {verse.sanskrit.word_breakdown && (
                  <TabsTrigger value="breakdown">Word-for-Word</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="devanagari" className="mt-4">
                <p className="text-2xl leading-relaxed font-devanagari text-center">
                  {verse.sanskrit.devanagari}
                </p>
              </TabsContent>
              
              <TabsContent value="iast" className="mt-4">
                <p className="text-lg font-mono text-center">
                  {verse.sanskrit.iast}
                </p>
              </TabsContent>
              
              {verse.sanskrit.word_breakdown && (
                <TabsContent value="breakdown" className="mt-4 space-y-2">
                  {verse.sanskrit.word_breakdown.map((word, idx) => (
                    <div key={idx} className="flex gap-4 text-sm">
                      <span className="font-semibold w-32">{word.transliteration}</span>
                      <span className="text-muted-foreground flex-1">{word.meaning}</span>
                    </div>
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
        
        {/* Translation */}
        <div className="translation-section">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
            Translation
          </h4>
          <p className="text-base leading-relaxed">
            {verse.translations[language].text}
          </p>
          {verse.translations[language].translator && (
            <p className="text-xs text-muted-foreground mt-2">
              — {verse.translations[language].translator}
            </p>
          )}
        </div>
        
        {/* Purport (collapsible) */}
        {viewMode !== 'compact' && verse.translations[language].purport && (
          <div className="purport-section border-t pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mb-2"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {expanded ? 'Hide' : 'Show'} Commentary
            </Button>
            
            {expanded && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {verse.translations[language].purport}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Concepts */}
        {verse.concepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {verse.concepts.map(concept => (
              <Badge 
                key={concept} 
                variant="secondary"
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => onConceptClick?.(concept)}
              >
                {concept}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.3 Key Pages

**1. Home/Dashboard**
```
┌─────────────────────────────────────────────────────┐
│  [Logo] Divine Vision          [Search] [Theme] [×] │
├─────────────────────────────────────────────────────┤
│                                                      │
│        Explore Sacred Hindu Scriptures               │
│        Through Intelligent Search & AI Guidance      │
│                                                      │
│   ┌──────────────────────────────────────────┐     │
│   │  🔍  Search verses by meaning, concept   │     │
│   │      or question...                       │     │
│   └──────────────────────────────────────────┘     │
│                                                      │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│   │ Śrīmad      │  │ Viṣṇu       │  │ Lalitā   │  │
│   │ Bhāgavatam  │  │ Sahasranāma │  │ Sahasra. │  │
│   │ 18,000+     │  │ 1,000 names │  │ 1,000    │  │
│   │ [Browse]    │  │ [Browse]    │  │ [Browse] │  │
│   └─────────────┘  └─────────────┘  └──────────┘  │
│                                                      │
│   Recent Explorations:                               │
│   • What is bhakti-yoga? (3 verses)                 │
│   • Names of Vishnu related to protection (12)     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**2. Search Results**
```
┌─────────────────────────────────────────────────────┐
│  ← Back  |  "krishna devotion"  |  [Filters ▾]     │
├─────────────────────────────────────────────────────┤
│  Found 247 verses across all sources                │
│                                                      │
│  Sort: Relevance ▾  |  View: [▦] [☰] [≣]           │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ [SB.11.14.21] ⭐ 94% match                   │   │
│  │ "Of all yogas, bhakti-yoga is the supreme"  │   │
│  │ › See full verse and commentary             │   │
│  │ Concepts: devotion • yoga • supreme truth   │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ [SB.7.5.23] ⭐ 91% match                     │   │
│  │ "Hearing and chanting about Krishna..."     │   │
│  │ › See full verse                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
│  [Load more...]                                      │
└─────────────────────────────────────────────────────┘
```

**3. Verse Browser** (hierarchical navigation)
```
┌─────────────────────────────────────────────────────┐
│  Śrīmad-Bhāgavatam > Canto 1 > Chapter 1            │
├─────────────────────────────────────────────────────┤
│  Sidebar                      Main Content          │
│  ┌────────────┐  ┌──────────────────────────────┐  │
│  │ Cantos     │  │ Chapter 1: Questions by Sages│  │
│  │ ▼ 1        │  │                               │  │
│  │   ▼ Ch 1   │  │ [Verse 1.1.1]                │  │
│  │     • 1.1  │  │ oṁ namo bhagavate vāsudevāya │  │
│  │     • 1.2  │  │ "O my Lord, Śrī Kṛṣṇa..."   │  │
│  │   › Ch 2   │  │ [Show Sanskrit] [Commentary] │  │
│  │ › 2        │  │                               │  │
│  │ › 3        │  │ [Verse 1.1.2]                │  │
│  └────────────┘  │ dharmaḥ projjhita...         │  │
│                   │                               │  │
│  [Progress]      │ [Next verse ›]                │  │
│  8/18,000        └──────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**4. AI Chat Interface**
```
┌─────────────────────────────────────────────────────┐
│  Ask Questions About the Scriptures                  │
│  Mode: [Conversational ▾]  Language: [English ▾]    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  👤 What is the relationship between karma           │
│     and devotion?                                    │
│                                                      │
│  🤖 Great question. The Bhāgavatam offers a         │
│     nuanced view on this...                          │
│                                                      │
│     According to [SB.11.20.30], karma (action)      │
│     and jñāna (knowledge) are preparatory steps     │
│     to bhakti (devotion). However, [SB.11.14.21]    │
│     clarifies that...                                │
│                                                      │
│     📚 Sources cited:                                │
│     • SB.11.20.30 (90% relevant)                    │
│     • SB.11.14.21 (87% relevant)                    │
│     [View full verses]                               │
│                                                      │
│     ⚠️ Note: This is an AI interpretation...        │
│                                                      │
│  ┌──────────────────────────────────────────┐      │
│  │ Type your question...             [Send] │      │
│  └──────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## 7. Performance Optimization

### 7.1 Data Loading Strategy

```typescript
// lib/data/loader.ts
const CACHE_VERSION = 'v1';

// Lazy load verses by chunk
export async function loadVerseChunk(source: string, chunkId: string) {
  const cacheKey = `verses_${source}_${chunkId}_${CACHE_VERSION}`;
  
  // Check cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch compressed data
  const response = await fetch(`/data/verses/${source}/${chunkId}.json.gz`);
  const decompressed = await decompressGzip(await response.arrayBuffer());
  const data = JSON.parse(new TextDecoder().decode(decompressed));
  
  // Cache for offline use
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (e) {
    // Quota exceeded, clear old cache
    clearOldCache();
  }
  
  return data;
}

// Progressive loading
export function useProgressiveVerseLoad(chunkIds: string[]) {
  const [loaded, setLoaded] = useState<Map<string, Verse[]>>(new Map());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    async function load() {
      for (const id of chunkIds) {
        if (!mounted) break;
        const data = await loadVerseChunk('bhagavatam', id);
        setLoaded(prev => new Map(prev).set(id, data));
      }
      setLoading(false);
    }
    
    load();
    return () => { mounted = false; };
  }, [chunkIds]);
  
  return { verses: Array.from(loaded.values()).flat(), loading };
}
```

### 7.2 Search Optimization

```typescript
// lib/search/optimized.ts
import { IndexedDB } from '@/lib/indexeddb';

class SearchEngine {
  private embeddingCache: Map<string, number[]> = new Map();
  private idb: IndexedDB;
  
  constructor() {
    this.idb = new IndexedDB('divine-vision-search');
  }
  
  async initialize() {
    // Load frequently used embeddings into memory
    const commonQueries = await this.idb.get('common-queries');
    for (const query of commonQueries || []) {
      this.embeddingCache.set(query, await this.generateEmbedding(query));
    }
  }
  
  async search(query: string, options: SearchOptions) {
    // Check embedding cache
    let queryEmbedding = this.embeddingCache.get(query);
    
    if (!queryEmbedding) {
      queryEmbedding = await this.generateEmbedding(query);
      
      // Cache if query is repeated
      const count = await this.idb.increment(`query:${query}`);
      if (count > 2) {
        this.embeddingCache.set(query, queryEmbedding);
      }
    }
    
    // Parallel search: semantic + keyword
    const [semantic, keyword] = await Promise.all([
      this.semanticSearch(queryEmbedding, options),
      this.keywordSearch(query, options)
    ]);
    
    return this.fuse(semantic, keyword);
  }
  
  private async semanticSearch(embedding: number[], options: SearchOptions) {
    // Load only relevant embedding chunks (filtering by source)
    const chunks = await this.getRelevantChunks(options.source);
    
    // Use Web Workers for parallel similarity computation
    return await this.computeSimilaritiesParallel(embedding, chunks);
  }
}
```

### 7.3 Rendering Optimization

```typescript
// components/VirtualizedVerseList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedVerseList({ verses }: { verses: Verse[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: verses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated verse card height
    overscan: 5 // Render 5 extra items for smooth scrolling
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <VerseCard verse={verses[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 9. Technical Specifications

### 9.1 Dependencies

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "18.3.0",
    "@google/generative-ai": "^0.21.0",
    "@radix-ui/react-*": "latest",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.408.0",
    "onnxruntime-web": "^1.19.0",
    "@tanstack/react-virtual": "^3.0.0",
    "marked": "^14.0.0",
    "class-variance-authority": "^0.7.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "playwright": "^1.47.0",
    "cheerio": "^1.0.0"
  }
}
```

### 9.2 Environment Variables

```bash
# .env.local
GOOGLE_API_KEY=your_gemini_api_key
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_DATA_VERSION=2025-01-01

# Build-time only
BUILD_EMBED_BATCH_SIZE=50
BUILD_RATE_LIMIT_MS=2000
```

### 9.3 Vercel Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 10. Data Integrity & Disclaimers

### 10.1 Source Attribution

Every verse must include:
```typescript
{
  source_url: "https://vedabase.io/en/library/sb/1/1/1/",
  translator: "A.C. Bhaktivedanta Swami Prabhupada",
  copyright: "Bhaktivedanta Book Trust International",
  last_verified: "2025-01-18"
}
```

### 10.2 UI Disclaimers

**Footer on every page**:
```
Divine Vision uses AI to help explore Hindu scriptures. For authoritative 
spiritual guidance, please consult qualified teachers in traditional lineages. 
All translations © Bhaktivedanta Book Trust. Learn more about our sources →
```

**Chat disclaimer** (shown once per session):
```
⚠️ Important: AI responses are interpretations based on textual analysis. 
They are not substitutes for guidance from living gurus or traditional 
commentaries. For practices, rituals, or spiritual questions, seek 
qualified teachers. [Understood]
```

**Sensitive topics** (auto-detected):
```
📖 Note: This topic has diverse interpretations across sampradāyas 
(theological schools). The response reflects the verses provided and should 
not be taken as the only valid view within the tradition.
```

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search accuracy | >85% user satisfaction | Feedback form on results |
| Response time (search) | <2s (p95) | Vercel Analytics |
| Response time (chat) | <5s (p95) | API monitoring |
| Data accuracy | 100% match to sources | Automated validation |
| Mobile responsiveness | 100% | Lighthouse CI |
| Accessibility | WCAG AA | axe DevTools |
| Bundle size | <500 KB (initial) | Webpack Bundle Analyzer |
| Uptime | >99.5% | Vercel status |

---