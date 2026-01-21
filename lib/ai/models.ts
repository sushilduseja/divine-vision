import { generateResponse as generateResponseImpl, generateEmbedding as generateEmbeddingImpl } from './providers';
import { ChatMode } from '@/types';
import { SYSTEM_PROMPTS } from './prompts';

export interface GenerateResponseOptions {
  mode?: ChatMode;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

// Re-export from providers for backward compatibility
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

  const basePrompt = SYSTEM_PROMPTS.base;
  const modePrompt = SYSTEM_PROMPTS[mode];
  const additionalContext = customSystemPrompt || context;
  const systemPrompt = additionalContext
    ? `${basePrompt}\n\n${modePrompt}\n\n${additionalContext}`
    : `${basePrompt}\n\n${modePrompt}`;

  // Import here to avoid circular dependency
  return generateResponseImpl(prompt, systemPrompt);
}

// Re-export embedding function
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateEmbeddingImpl(text);
}
