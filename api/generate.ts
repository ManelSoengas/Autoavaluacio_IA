import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return Response.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return Response.json({
      text: response.text ?? 'No s’ha pogut generar una resposta.',
    });
  } catch (error) {
    console.error('Gemini error:', error);

    return Response.json(
      { error: "S'ha produït un error en generar la resposta." },
      { status: 500 }
    );
  }
}
