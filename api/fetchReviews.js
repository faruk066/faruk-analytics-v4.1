export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST desteklenir." });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Geçerli bir yorum URL'si gerekli." });
    }

    console.log("Yorumlar çekiliyor:", url);

    // Kullanıcı linkine göre hangi siteden veri çekileceğini tespit et
    let site = "";
    if (url.includes("google.com/maps")) site = "Google";
    else if (url.includes("trendyol.com")) site = "Trendyol";
    else if (url.includes("yemeksepeti.com")) site = "Yemeksepeti";
    else if (url.includes("hepsiburada.com")) site = "Hepsiburada";
    else site = "Bilinmeyen";

    // Test amaçlı sahte veri (API henüz tam entegre değilse buradan test edilir)
    const fakeReviews = [
      {
        id: 1,
        text: "Çok güzel bir deneyimdi, tekrar geleceğim!",
        rating: 5,
        date: "2025-11-09",
      },
      {
        id: 2,
        text: "Ortalama bir hizmetti, biraz daha iyi olabilirdi.",
        rating: 3,
        date: "2025-11-08",
      },
      {
        id: 3,
        text: "Hiç memnun kalmadım, tavsiye etmiyorum.",
        rating: 1,
        date: "2025-11-07",
      },
    ];

    return res.status(200).json({
      source: site,
      total: fakeReviews.length,
      reviews: fakeReviews,
    });
  } catch (error) {
    console.error("fetchReviews hata:", error);
    return res.status(500).json({ error: "Yorumlar alınamadı." });
  }
}
