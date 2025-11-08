import { jsPDF } from "jspdf";

export default async function handler(req, res) {
  try {
    const { summary, sentiment, keywords, reviews } = req.body;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Yorum Analizi Raporu", 20, 20);
    doc.setFont("helvetica", "normal");

    doc.text(`📅 Tarih: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text("Özet:", 20, 40);
    doc.text(summary || "Veri yok", 30, 50);

    doc.text("Anahtar Kelimeler:", 20, 70);
    keywords?.slice(0, 10).forEach((k, i) => {
      doc.text(`• ${k.word} (${k.sentiment})`, 30, 80 + i * 8);
    });

    const pdf = doc.output("arraybuffer");
    res.setHeader("Content-Type", "application/pdf");
    res.send(Buffer.from(pdf));
  } catch (err) {
    res.status(500).json({ error: "PDF oluşturma hatası: " + err.message });
  }
}
