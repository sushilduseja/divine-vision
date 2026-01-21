// lib/ai/providers.ts - GROQ primary, OpenRouter fallback
import Groq from "groq-sdk";
import OpenAI from "openai";

// GROQ Configuration
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// OpenRouter Configuration (uses OpenAI SDK)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL || 'http://localhost:9002',
    'X-Title': process.env.SITE_NAME || 'Divine Vision',
  },
});

// GROQ models (fastest to most capable)
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

// Free OpenRouter models (most capable first)
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-medium-128k-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
] as const;

interface CacheEntry {
  data: string;
  timestamp: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, RateLimitEntry>();
const exhaustedModels = new Set<string>();
const modelCooldowns = new Map<string, number>();

const CACHE_TTL = 3600000; // 1 hour
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_REQUESTS_PER_DAY = 1500;
const MODEL_COOLDOWN = 300000; // 5 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Validate API keys
if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
  console.warn('[WARN] No API keys configured. Set GROQ_API_KEY or OPENROUTER_API_KEY');
}

function simpleHash(str: string): string {
  let hash = 0;
  const maxLen = Math.min(str.length, 500);
  for (let i = 0; i < maxLen; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Minute limit
  const minuteKey = 'minute';
  const minuteLimit = rateLimits.get(minuteKey);
  
  if (!minuteLimit || now > minuteLimit.resetAt) {
    rateLimits.set(minuteKey, { count: 1, resetAt: now + 60000 });
  } else if (minuteLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    console.warn(`[Rate] Minute limit: ${MAX_REQUESTS_PER_MINUTE}/min`);
    return false;
  } else {
    minuteLimit.count++;
  }
  
  // Day limit
  const dayKey = 'day';
  const dayLimit = rateLimits.get(dayKey);
  const now_date = new Date(now);
  const tomorrow = new Date(Date.UTC(
    now_date.getUTCFullYear(),
    now_date.getUTCMonth(),
    now_date.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  
  if (!dayLimit || now > dayLimit.resetAt) {
    rateLimits.set(dayKey, { count: 1, resetAt: tomorrow.getTime() });
  } else if (dayLimit.count >= MAX_REQUESTS_PER_DAY) {
    console.warn(`[Rate] Daily limit: ${MAX_REQUESTS_PER_DAY}/day`);
    return false;
  } else {
    dayLimit.count++;
  }
  
  return true;
}

function getFromCache(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now > entry.timestamp + CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: string) {
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Batch delete oldest 20% when cache is full
  if (responseCache.size > 200) {
    const entries = Array.from(responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toDelete = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toDelete; i++) {
      responseCache.delete(entries[i][0]);
    }
  }
}

function isModelAvailable(model: string): boolean {
  if (exhaustedModels.has(model)) {
    const cooldownUntil = modelCooldowns.get(model);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      return false;
    }
    exhaustedModels.delete(model);
    modelCooldowns.delete(model);
  }
  return true;
}

function markModelExhausted(model: string) {
  exhaustedModels.add(model);
  modelCooldowns.set(model, Date.now() + MODEL_COOLDOWN);
}

async function tryGroqModels(
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) {
    console.log('[GROQ] Skipped - no API key');
    return null;
  }

  const availableModels = GROQ_MODELS.filter(isModelAvailable);
  
  for (const model of availableModels) {
    try {
      console.log(`[GROQ] Trying ${model}`);
      
      const completion = await Promise.race([
        groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 2048,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
        )
      ]);
      
      const text = completion.choices[0]?.message?.content || '';
      
      if (!text) {
        console.log(`[GROQ] ✗ ${model} empty response`);
        continue;
      }
      
      console.log(`[GROQ] ✓ ${model}`);
      return text;
      
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || '';
      const status = error.status || error.statusCode || 0;
      
      if (msg.includes('timeout')) {
        console.log(`[GROQ] ✗ ${model} timeout`);
        continue;
      }
      
      if (status === 429 || msg.includes('quota') || msg.includes('rate limit')) {
        console.log(`[GROQ] ✗ ${model} rate limited`);
        markModelExhausted(model);
        continue;
      }
      
      if (status === 401 || status === 403 || msg.includes('invalid') || msg.includes('unauthorized')) {
        console.log(`[GROQ] ✗ Auth failed, skipping GROQ`);
        break;
      }
      
      if (status >= 500 || msg.includes('500') || msg.includes('503')) {
        console.log(`[GROQ] ✗ ${model} server error`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      console.log(`[GROQ] ✗ ${model}:`, error.message?.slice(0, 100));
      continue;
    }
  }
  
  return null;
}

async function tryOpenRouterModels(
  prompt: string,
  systemPrompt: string
): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('[OpenRouter] Skipped - no API key');
    return null;
  }

  const availableModels = OPENROUTER_MODELS.filter(isModelAvailable);
  
  for (const model of availableModels) {
    try {
      console.log(`[OpenRouter] Trying ${model}`);
      
      const completion = await Promise.race([
        openrouter.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 2048,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT)
        )
      ]);
      
      const text = completion.choices[0]?.message?.content || '';
      
      if (!text) {
        console.log(`[OpenRouter] ✗ ${model} empty response`);
        continue;
      }
      
      console.log(`[OpenRouter] ✓ ${model}`);
      return text;
      
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || '';
      const status = error.status || error.statusCode || 0;
      
      if (msg.includes('timeout')) {
        console.log(`[OpenRouter] ✗ ${model} timeout`);
        continue;
      }
      
      if (status === 429 || msg.includes('quota') || msg.includes('rate limit')) {
        console.log(`[OpenRouter] ✗ ${model} rate limited`);
        markModelExhausted(model);
        continue;
      }
      
      if (status === 401 || status === 403 || msg.includes('invalid') || msg.includes('unauthorized')) {
        console.log(`[OpenRouter] ✗ Auth failed, skipping OpenRouter`);
        break;
      }
      
      if (status >= 500 || msg.includes('500') || msg.includes('503')) {
        console.log(`[OpenRouter] ✗ ${model} server error`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      console.log(`[OpenRouter] ✗ ${model}:`, error.message?.slice(0, 100));
      continue;
    }
  }
  
  return null;
}

function generateFallbackResponse(prompt: string): string {
  const contextMatch = prompt.match(/Scripture Context:([\s\S]*?)User Question:/);
  const questionMatch = prompt.match(/User Question:([\s\S]*?)(?:Provide|Answer)/);
  
  if (!contextMatch || !questionMatch) {
    return "AI service temporarily unavailable. The search has found relevant verses for your question, displayed below. Please try again later for detailed analysis.";
  }
  
  const context = contextMatch[1].trim();
  const verses = context.split(/\[(\d+)\]/).filter(Boolean);
  const verseData: Array<{num: string, content: string}> = [];
  
  for (let i = 0; i < verses.length; i += 2) {
    if (verses[i] && verses[i + 1]) {
      verseData.push({
        num: verses[i],
        content: verses[i + 1].trim()
      });
    }
  }
  
  if (verseData.length === 0) {
    return "Relevant verses found but AI analysis unavailable. Verses are displayed in sources below.";
  }
  
  let response = `Based on the sacred texts:\n\n`;
  
  verseData.forEach(verse => {
    const lines = verse.content.split('\n').filter(l => l.trim());
    const translation = lines.find(l => l.startsWith('Translation:'));
    const commentary = lines.find(l => l.startsWith('Commentary:'));
    
    if (translation) {
      const translationText = translation.replace('Translation:', '').trim();
      response += `**[${verse.num}]** ${translationText}\n\n`;
      
      if (commentary) {
        const commentaryText = commentary.replace('Commentary:', '').trim().slice(0, 200);
        response += `*${commentaryText}${commentaryText.length >= 200 ? '...' : ''}*\n\n`;
      }
    }
  });
  
  response += `\n---\n\n*Note: AI service temporarily unavailable. Showing direct verse translations and brief commentaries. Try again later for detailed analysis.*`;
  
  return response;
}

export async function generateResponse(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  // Check cache
  const cacheKey = simpleHash(prompt + systemPrompt);
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[Cache] ✓ Hit');
    return cached;
  }
  
  // Check rate limits
  if (!checkRateLimit()) {
    console.log('[Rate] Limit exceeded, using fallback');
    return generateFallbackResponse(prompt);
  }
  
  // Try GROQ
  const groqResult = await tryGroqModels(prompt, systemPrompt);
  if (groqResult) {
    setCache(cacheKey, groqResult);
    return groqResult;
  }
  
  // Fallback to OpenRouter
  console.log('[Fallback] Trying OpenRouter');
  const openRouterResult = await tryOpenRouterModels(prompt, systemPrompt);
  if (openRouterResult) {
    setCache(cacheKey, openRouterResult);
    return openRouterResult;
  }
  
  // Graceful degradation
  console.log('[Degradation] All models failed, using fallback');
  return generateFallbackResponse(prompt);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  throw new Error('Embedding generation not supported');
}