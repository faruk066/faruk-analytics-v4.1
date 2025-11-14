// api/googleSearch.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST desteklenir." });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Arama sorgusu gerekli." });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;

    const searchResponse = await fetch(url);
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error("Google Search API'den geçersiz yanıt:", errorBody);
      return res.status(searchResponse.status).json({ error: "Google Arama API'sinden bir hata alındı." });
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return res.status(404).json({ error: "Arama sonucu bulunamadı." });
    }

    // İlk 3 arama sonucunu al
    const topResults = searchData.items.slice(0, 3);
    let allScrapedText = "";

    for (const result of topResults) {
      try {
        const scraperUrl = `${req.headers.host.startsWith('localhost') ? 'http' : 'https'}://${req.headers.host}/api/scraperAPI?url=${encodeURIComponent(result.link)}`;
        const scraperResponse = await fetch(scraperUrl);

        if (scraperResponse.ok) {
          const scrapedData = await scraperResponse.json();
          if (scrapedData.reviews && scrapedData.reviews.length > 0) {
            const combinedText = scrapedData.reviews.map(r => r.text).join(" \\n\\n ");
            allScrapedText += `--- Sayfa: ${result.title} ---\\n${combinedText}\\n\\n`;
          }
        }
      } catch (scrapeError) {
        console.error(`'${result.link}' adresinden veri kazınırken hata oluştu:`, scrapeError);
      }
    }

    if (!allScrapedText) {
      return res.status(500).json({ error: "Arama sonuçlarından içerik ayıklanamadı." });
    }

    // Kazınan metni Gemini ile analiz et
    const analysisPrompt = `Aşağıdaki metinleri analiz et ve bir özet çıkar:\n\n${allScrapedText}`;

    const geminiUrl = `${req.headers.host.startsWith('localhost') ? 'http' : 'https'}://${req.headers.host}/api/gemini`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: analysisPrompt }),
    });

    if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error("Gemini API'den geçersiz yanıt:", errorBody);
        return res.status(geminiResponse.status).json({ error: "Gemini API'sinden bir hata alındı." });
    }

    const geminiData = await geminiResponse.json();
    return res.status(200).json(geminiData);
  } catch (error) {
    console.error("Google Arama API hatası:", error);
    return res.status(500).json({ error: "Arama başarısız." });
  }
}
