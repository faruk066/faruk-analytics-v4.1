import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const { reviews } = await req.json();
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(reviews);
  
  return Response.json({ analysis: result.response.text() });
}