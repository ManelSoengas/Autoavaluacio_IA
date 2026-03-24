import { GoogleGenerativeAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Missing prompt" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    return Response.json({ text });

  } catch (error) {
    console.error("Error generating content:", error);
    return Response.json(
      { error: "Error generating response" },
      { status: 500 }
    );
  }
}
