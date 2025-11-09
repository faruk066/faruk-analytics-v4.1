// api/gemini.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST desteklenir." });
  }

  try {
    const { text } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }]
        })
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Gemini API hatası:", error);
    return res.status(500).json({ error: "Analiz başarısız." });
  }
}