export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST desteklenir." });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Geçerli bir URL gerekli." });
    }

    console.log("Puppeteer Scraper başlatılıyor:", url);

    // Puppeteer, Vercel ortamında doğrudan çalışmaz.
    // Bu yüzden örnek veri dönüyoruz.
    // Gerçek scraping için dış API veya proxy kullanılır.

    const fakeReviews = [
      {
        id: 1,
        text: "Gerçekçi test verisi: Puppeteer modu aktif değil.",
        rating: 5,
        date: "2025-11-10",
      },
    ];

    return res.status(200).json({
      message: "Puppeteer (test) yanıtı döndü.",
      reviews: fakeReviews,
    });
  } catch (error) {
    console.error("PuppeteerScraper hata:", error);
    return res
      .status(500)
      .json({ error: "Puppeteer işlemi başarısız. Detay: " + error.message });
  }
}
