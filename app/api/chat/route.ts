// app/api/chat/route.ts - FIXED (better error messages)
import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/rag/contextBuilder';
import { generateResponse } from '@/lib/ai/providers';
import { ChatMode, Language } from '@/types';
import { SAFETY_PROMPTS, detectSensitiveQuery, detectControversialTopic, SYSTEM_PROMPTS } from '@/lib/ai/prompts';

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
      maxTokens: 6000
    });
    
    if (sources.length === 0) {
      return NextResponse.json({
        response: "I couldn't find relevant verses for your question. Please try rephrasing or asking about concepts from the Bhāgavatam, Viṣṇu Sahasranāma, or Lalitā Sahasranāma.",
        sources: [],
        metadata: { verses_used: 0, mode, has_disclaimer: false }
      });
    }
    
    const conversationHistory = history
      .slice(-3)
      .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.slice(0, 200)}`)
      .join('\n');
    
    const needsDisclaimer = detectSensitiveQuery(message);
    const needsControversy = detectControversialTopic(message);
    
    const basePrompt = SYSTEM_PROMPTS.base;
    const modePrompt = SYSTEM_PROMPTS[mode as ChatMode];
    let systemPrompt = `${basePrompt}\n\n${modePrompt}`;
    
    if (needsControversy) {
      systemPrompt += `\n\n${SAFETY_PROMPTS.controversial}`;
    }
    
    const prompt = `${conversationHistory ? 'Recent conversation:\n' + conversationHistory + '\n\n' : ''}

Scripture Context:
${context}

User Question: ${message}

Provide a clear, accurate answer that:
1. Directly addresses the question
2. Cites specific verses using [1], [2] format
3. Explains the philosophical meaning
4. Stays grounded in the provided verses

Answer:`;

    // Try to generate response (with fallback)
    const response = await generateResponse(prompt, systemPrompt);
    
    let finalResponse = response;
    if (needsDisclaimer && !response.includes('temporarily unavailable')) {
      finalResponse = `${response}\n\n---\n\n${SAFETY_PROMPTS.disclaimer}`;
    }
    
    const translationLang = language === 'hindi' ? 'hindi' : 'english';
    
    return NextResponse.json({
      response: finalResponse,
      sources: sources.map(s => ({
        text_id: s.text_id,
        translation: (s.translations[translationLang] || s.translations.english).text,
        relevance: s.relevance_score
      })),
      metadata: {
        verses_used: sources.length,
        mode,
        has_disclaimer: needsDisclaimer,
        fallback_used: response.includes('temporarily unavailable')
      }
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}