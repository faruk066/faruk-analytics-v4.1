export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  try {
    const domain = new URL(url).hostname;

    if (domain.includes("google.com")) {
      // Google Maps yorumları (örnek simülasyon)
      return res.status(200).json({
        source: "Google Maps",
        reviews: [
          { user: "Ali", rating: 5, text: "Harika hizmet!", date: "2024-11-02" },
          { user: "Ayşe", rating: 2, text: "Kargo çok geç geldi.", date: "2024-11-04" }
        ]
      });
    }

    if (domain.includes("trustpilot.com")) {
      // Trustpilot örneği
      return res.status(200).json({
        source: "Trustpilot",
        reviews: [
          { user: "Can", rating: 4, text: "Ürün güzel ama kargo yavaştı.", date: "2024-11-06" }
        ]
      });
    }

    return res.status(404).json({ error: "Desteklenmeyen yorum kaynağı" });
  } catch (err) {
    return res.status(500).json({ error: "fetchReviews hata: " + err.message });
  }
}
