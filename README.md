# Sanskrit Scripture AI Assistant - Complete Rewrite

## Overview
Enterprise-grade RAG system for Sanskrit scriptures with advanced features:
- **Hybrid Search**: Vector embeddings + BM25 keyword search with Reciprocal Rank Fusion
- **Multi-hop Reasoning**: Query decomposition and multi-document synthesis
- **Zero Database Dependencies**: All data in static JSON with in-memory search
- **Bilingual Support**: Full English and Hindi translations
- **LLM Reranking**: Gemini-powered result reranking
- **Citation Tracking**: Source attribution for all answers

## Tech Stack
- Next.js 14.2.0 (App Router, TypeScript strict)
- Google Gemini 1.5 Pro (@ai-sdk/google + ai SDK)
- Static JSON data store with pre-computed embeddings
- In-memory hybrid search (vector + keyword)
- Client-side caching via localStorage
- shadcn/ui + Tailwind CSS

## Project Structure
```
├── app/                    # Next.js 14 app router pages and API routes
│   ├── layout.tsx         # Root layout with navigation
│   ├── page.tsx           # Landing page
│   ├── search/page.tsx    # Search interface
│   ├── chat/page.tsx      # Chat interface
│   ├── api/
│   │   ├── search/route.ts    # Hybrid search API
│   │   ├── chat/route.ts      # Chat with RAG API
│   │   └── rerank/route.ts    # LLM reranking API
│   └── globals.css
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── VerseCard.tsx      # Verse display component
│   ├── ChatMessage.tsx    # Chat message with markdown
│   ├── SearchFilters.tsx  # Source and language filters
│   └── ConceptGraph.tsx   # Concept visualization
├── lib/
│   ├── ai.ts              # Gemini AI client
│   ├── utils.ts           # Utility functions
│   ├── search/
│   │   ├── vectorSearch.ts    # Cosine similarity search
│   │   ├── keywordSearch.ts   # BM25 algorithm
│   │   ├── hybridSearch.ts    # RRF fusion
│   │   └── reranker.ts        # LLM reranking
│   ├── rag/
│   │   ├── queryDecomposer.ts     # Complex question breakdown
│   │   ├── contextBuilder.ts      # Multi-document synthesis
│   │   └── citationGenerator.ts   # Source attribution
│   └── data/
│       ├── loader.ts      # JSON data loading
│       └── cache.ts       # localStorage caching
├── data/
│   └── mock-verses.json   # Sample data (5 verses)
├── hooks/
│   ├── useDebounce.ts     # Debounce hook
│   └── useLocalStorage.ts # localStorage hook
└── types/
    └── index.ts           # TypeScript definitions
```

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

3. Run development server:
```bash
npm run dev
```

4. Open http://localhost:9002

## Features

### Hybrid Search Engine
Combines two search strategies:
- **Vector Search**: Semantic similarity using cosine distance
- **Keyword Search**: BM25 algorithm for lexical matching
- **Fusion**: Reciprocal Rank Fusion (RRF) combines both results

### Advanced RAG System
- **Query Decomposition**: Breaks complex questions into simpler sub-queries
- **Multi-Document Synthesis**: Combines information from multiple verses
- **LLM Reranking**: Uses Gemini to reorder results by relevance
- **Citation Generation**: Tracks and formats source attributions

### Data Architecture
- No external database required
- Pre-computed embeddings stored in JSON
- In-memory search with efficient algorithms
- Client-side caching for performance

### Scripture Sources
1. **Śrīmad-Bhāgavatam**: Ancient Vedic text on devotion
2. **Viṣṇu Sahasranāma**: 1000 names of Lord Vishnu
3. **Lalitā Sahasranāma**: 1000 names of Goddess Lalita

## API Endpoints

### POST /api/search
Hybrid search for verses:
```json
{
  "query": "What is dharma?",
  "source": "all",
  "limit": 20
}
```

### POST /api/chat
Chat with RAG context:
```json
{
  "message": "Explain the relationship between dharma and bhakti",
  "language": "english",
  "history": []
}
```

### POST /api/rerank
Rerank search results:
```json
{
  "query": "What is karma?",
  "results": [...]
}
```

## Development Notes

### Current Limitations
1. **Embeddings**: Currently using mock hash-based embeddings for development
   - TODO: Integrate actual Gemini embedding API when available
2. **Windows Build**: Known issue with Next.js 14.2.0 CSS loading on Windows
   - Development mode works fine
   - Production build may require Linux/Mac or Next.js 15 upgrade

### Performance Targets
- First search: < 3s (including embedding generation)
- Cached search: < 500ms
- Chat response: < 5s for complex questions
- Support 20,000 verses in memory
- Handle 5+ source synthesis
- Multi-hop reasoning up to 3 levels deep

## Key Implementation Details

### Hybrid Search Algorithm
```typescript
// 1. Generate query embedding
const queryEmbedding = await generateEmbedding(query);

// 2. Vector search (semantic)
const vectorResults = await vectorSearch(queryEmbedding, source, limit * 2);

// 3. Keyword search (lexical)
const keywordResults = await keywordSearch(query, source, limit * 2);

// 4. Combine with RRF
const combined = reciprocalRankFusion(vectorResults, keywordResults, 60);
```

### RAG Context Building
```typescript
// 1. Decompose complex query
const subQueries = await decomposeQuery(query);

// 2. Search for each sub-query
const allResults = await Promise.all(
  subQueries.map(q => hybridSearch(q, 'all', 5))
);

// 3. Remove duplicates and rerank
const uniqueResults = deduplicateResults(allResults.flat());
const reranked = await rerankResults(query, uniqueResults);

// 4. Build context from top 8 verses
const context = buildContextString(reranked.slice(0, 8), language);
```

## Next Steps

### To Complete
1. **Integrate Real Gemini Embeddings**: Replace mock embeddings with actual API
2. **Expand Data**: Add more verses from all three scriptures
3. **Generate Pre-computed Embeddings**: Create verses.json with real embeddings
4. **Add Tests**: Unit tests for search algorithms and RAG components
5. **Performance Optimization**: Profile and optimize search algorithms
6. **Deployment**: Deploy to Vercel or similar platform

### Future Enhancements
1. **Streaming Responses**: Implement streaming for chat API
2. **Advanced Visualizations**: Interactive concept graphs
3. **User Accounts**: Save search history and preferences
4. **More Scriptures**: Add Bhagavad Gita, Upanishads, etc.
5. **Multi-language**: Add more language translations

## License
MIT

## Credits
Built with Next.js, Gemini AI, shadcn/ui, and Tailwind CSS.
