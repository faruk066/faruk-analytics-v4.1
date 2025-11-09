export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  // Puppeteer currently disabled on Vercel due to memory/timeout constraints
  // Returning informative response instead
  
  return res.status(200).json({
    source: "Puppeteer (Geçici Devre Dışı)",
    url,
    reviewCount: 3,
    reviews: [
      {
        user: "Sistem Bildirimi",
        rating: 0,
        text: "🚧 Puppeteer scraper şu anda Vercel'de çalışmıyor. Bu, Vercel Free tier'da Chromium için yeterli memory (1024MB) ve timeout (10s) olmamasından kaynaklanıyor. Lütfen 'Hızlı (Cheerio)' modunu kullanın.",
        date: new Date().toISOString().split('T')[0]
      },
      {
        user: "Alternatif Çözümler",
        rating: 0,
        text: "✅ Çözüm 1: 'Hızlı (Cheerio)' modu statik HTML siteleri için çalışıyor.\n✅ Çözüm 2: Vercel Pro ile 3GB RAM ve 60s timeout.\n✅ Çözüm 3: Scraping API servisleri (ScraperAPI, Apify).",
        date: new Date().toISOString().split('T')[0]
      },
      {
        user: "Test Önerisi",
        rating: 0,
        text: "Sistem test etmek için 'Hızlı' modu ile şu URL'leri deneyin:\n• Amazon product reviews\n• Trustpilot reviews\n• TripAdvisor reviews\n\nBu siteler statik HTML kullanır ve Cheerio ile çalışır.",
        date: new Date().toISOString().split('T')[0]
      }
    ],
    method: "Puppeteer (Unavailable)",
    warning: "Puppeteer şu anda Vercel Free tier'da kullanılamıyor. Lütfen Hızlı (Cheerio) modunu kullanın."
  });
}