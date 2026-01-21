// scripts/test-api.ts - NEW FILE (test which models work)
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const MODELS_TO_TEST = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b-latest',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

async function testModels() {
  console.log('Testing Gemini models with current API key...\n');
  
  for (const model of MODELS_TO_TEST) {
    try {
      const start = Date.now();
      const { text } = await generateText({
        model: google(model),
        prompt: 'Say hello',
        maxTokens: 10
      });
      const duration = Date.now() - start;
      
      console.log(`✓ ${model.padEnd(30)} ${duration}ms - Response: ${text.slice(0, 50)}`);
    } catch (error: any) {
      const msg = error.message?.slice(0, 100) || 'Unknown error';
      console.log(`✗ ${model.padEnd(30)} FAILED: ${msg}`);
    }
  }
}

testModels();