import { generateText, embed } from 'ai';
import { google } from '@ai-sdk/google';

export async function generateResponse(prompt: string, context: string) {
  const systemPrompt = `You are a wise sage knowledgeable in Hindu scriptures. Use the following context to answer: ${context}`;
  
  const { text } = await generateText({
    model: google('gemini-1.5-pro-latest'),
    prompt,
    system: systemPrompt,
    temperature: 0.3,
    maxOutputTokens: 2048
  });
  return text;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: google.embedding('text-embedding-004'),
    value: text,
  });
  return embedding;
}