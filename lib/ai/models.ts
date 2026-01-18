import { generateText, embed } from 'ai';
import { google } from '@ai-sdk/google';
import { ChatMode } from '@/types';
import { SYSTEM_PROMPTS } from './prompts';

// Tier-based model fallback system
const MODEL_TIERS = [
  // Tier 1: Latest experimental (best performance)
  'gemini-2.0-flash-exp',
  
  // Tier 2: Proven production models
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-002',
  
  // Tier 3: Fallback (older but reliable)
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  
  // Tier 4: Last resort
  'gemini-1.0-pro'
] as const;

let workingModel: string | null = null;
let modelCheckInProgress: Promise<string> | null = null;

export interface GenerateResponseOptions {
  mode?: ChatMode;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Finds a working model by testing each tier sequentially
 * Caches the result to avoid repeated checks
 */
async function findWorkingModel(): Promise<string> {
  // Return cached model if available
  if (workingModel) return workingModel;
  
  // If check is in progress, wait for it
  if (modelCheckInProgress) {
    return modelCheckInProgress;
  }
  
  // Start new check
  modelCheckInProgress = (async () => {
    for (const modelName of MODEL_TIERS) {
      try {
        // Quick health check with minimal tokens
        await generateText({
          model: google(modelName),
          prompt: 'test',
          maxOutputTokens: 5,
          temperature: 0
        });
        
        workingModel = modelName;
        console.log(`✓ Using model: ${modelName}`);
        modelCheckInProgress = null;
        return modelName;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.warn(`✗ Model ${modelName} failed:`, errorMsg);
        
        // If it's a quota/rate limit error, try next model immediately
        // If it's a model not found error, try next model
        if (
          errorMsg.includes('quota') || 
          errorMsg.includes('rate limit') ||
          errorMsg.includes('not found') ||
          errorMsg.includes('not available')
        ) {
          continue;
        }
        
        // For other errors, also try next model
        continue;
      }
    }
    
    modelCheckInProgress = null;
    throw new Error('No working Gemini models found. Check API key and quotas.');
  })();
  
  return modelCheckInProgress;
}

/**
 * Resets the cached working model (useful for testing or after errors)
 */
export function resetModelCache(): void {
  workingModel = null;
  modelCheckInProgress = null;
}

/**
 * Generates a text response using tier-based model fallback
 */
export async function generateResponse(
  prompt: string,
  context: string,
  options: GenerateResponseOptions = {}
): Promise<string> {
  const {
    mode = 'conversational',
    systemPrompt: customSystemPrompt,
    temperature = 0.4,
    maxOutputTokens = 2048
  } = options;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  // Build system prompt
  // context parameter is used as additional system context (for backward compatibility)
  // customSystemPrompt from options takes precedence
  const basePrompt = SYSTEM_PROMPTS.base;
  const modePrompt = SYSTEM_PROMPTS[mode];
  const additionalContext = customSystemPrompt || context;
  const systemPrompt = additionalContext
    ? `${basePrompt}\n\n${modePrompt}\n\n${additionalContext}`
    : `${basePrompt}\n\n${modePrompt}`;

  // Find working model with fallback
  const modelName = await findWorkingModel();
  
  try {
    const { text } = await generateText({
      model: google(modelName),
      prompt,
      system: systemPrompt,
      temperature,
      maxOutputTokens
    });
    
    return text;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    
    // If it's a quota/rate limit error, reset cache and throw with helpful message
    if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      resetModelCache();
      throw new Error('API rate limit reached. Please try again in a minute.');
    }
    
    // If model-specific error, reset cache to try different model next time
    if (errorMsg.includes('not found') || errorMsg.includes('not available')) {
      resetModelCache();
    }
    
    throw error;
  }
}

/**
 * Generates embeddings using the stable embedding model
 * Embedding models are more stable, so we use a single model with error handling
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  try {
    const { embedding } = await embed({
      model: google.embedding('text-embedding-004'),
      value: text,
    });
    
    return embedding;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      throw new Error('Embedding API rate limit reached. Please try again later.');
    }
    
    throw new Error(`Embedding generation failed: ${errorMsg}`);
  }
}
