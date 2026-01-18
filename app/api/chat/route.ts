import { NextRequest, NextResponse } from 'next/server';
import { buildContext } from '@/lib/rag/contextBuilder';
import { generateResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { message, language = 'english', history = [] } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { context, sources } = await buildContext(message, language);
    
    const conversationHistory = history
      .slice(-4)
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');
    
    const systemPrompt = language === 'hindi'
      ? `आप एक विद्वान संस्कृत शास्त्र विशेषज्ञ हैं। दिए गए श्लोकों के आधार पर गहन, विस्तृत उत्तर दें।

नियम:
- केवल दिए गए संदर्भ का उपयोग करें
- उद्धरण स्पष्ट रूप से दें [संदर्भ संख्या]
- जटिल अवधारणाओं को सरल करें`
      : `You are a knowledgeable guide to Sanskrit scriptures. Provide thoughtful answers based on the given verses.

Guidelines:
- Use ONLY the provided context
- Cite sources clearly using [reference number]
- Explain concepts simply and clearly
- Connect related ideas across verses`;

    const prompt = `${conversationHistory ? 'Previous conversation:\n' + conversationHistory + '\n\n' : ''}

Scripture Context:
${context}

Question: ${message}

Provide a thoughtful answer that:
1. Directly addresses the question
2. Cites specific verses [1], [2], etc.
3. Explains the deeper meaning clearly`;

    const response = await generateResponse(prompt, systemPrompt);
    
    return NextResponse.json({
      response,
      sources: sources.map(s => ({
        text_id: s.text_id,
        translation: language === 'hindi' ? s.hindi_translation : s.english_translation,
        similarity: s.similarity
      }))
    });
    
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response' },
      { status: 500 }
    );
  }
}