import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/rag/contextBuilder';
import { generateResponse } from '@/lib/ai/models';
import { ChatMode, Language } from '@/types';
import { SAFETY_PROMPTS, detectSensitiveQuery, detectControversialTopic } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      language = 'english', 
      history = [],
      mode = 'conversational'
    } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { context, sources } = await buildContext(message, language as Language, {
      template: 'verse_analysis',
      includeWordMeanings: true,
      maxTokens: 6000,
      useReranking: true
    });
    
    const conversationHistory = history
      .slice(-6)
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Determine if disclaimers are needed
    const needsDisclaimer = detectSensitiveQuery(message);
    const needsControversy = detectControversialTopic(message);
    
    // Build system prompt with safety considerations
    let additionalSystemPrompt = '';
    if (needsControversy) {
      additionalSystemPrompt += SAFETY_PROMPTS.controversial + '\n\n';
    }
    
    const prompt = `${conversationHistory ? 'Previous conversation:\n' + conversationHistory + '\n\n' : ''}

Scripture Context:
${context}

Question: ${message}

Provide a thoughtful answer that:
1. Directly addresses the question
2. Cites specific verses using [1], [2], etc.
3. Explains the deeper meaning clearly
4. Connects related ideas across verses if applicable`;

    const response = await generateResponse(prompt, additionalSystemPrompt, {
      mode: mode as ChatMode,
      temperature: 0.4,
      maxOutputTokens: 2048
    });
    
    // Add disclaimer if needed
    let finalResponse = response;
    if (needsDisclaimer) {
      finalResponse = `${response}\n\n---\n\n${SAFETY_PROMPTS.disclaimer}`;
    }
    
    const translation = language === 'hindi' ? 'hindi' : 'english';
    
    return NextResponse.json({
      response: finalResponse,
      sources: sources.map(s => ({
        text_id: s.text_id,
        translation: s.translations[translation]?.text || s.translations.english.text,
        relevance: s.relevance_score
      })),
      metadata: {
        verses_used: sources.length,
        mode,
        has_disclaimer: needsDisclaimer
      }
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    const errorMsg = error?.message || String(error);
    
    // Handle specific error types with appropriate status codes
    if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
      return NextResponse.json(
        { error: 'API rate limit reached. Please try again in a minute.' },
        { status: 429 }
      );
    }
    
    if (errorMsg.includes('not configured') || errorMsg.includes('API key')) {
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    
    if (errorMsg.includes('No working Gemini models')) {
      return NextResponse.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: errorMsg || 'Failed to get response. Please try again.' },
      { status: 500 }
    );
  }
}