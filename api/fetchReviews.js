import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  try {
    const domain = new URL(url).hostname;
    
    // Fetch HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return res.status(400).json({ error: "URL'den veri çekilemedi" });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let reviews = [];
    let source = domain;
    
    // Google Maps scraping
    if (domain.includes("google.com")) {
      source = "Google Maps";
      
      // Google Maps review selectors (dinamik olabilir)
      $('[data-review-id]').each((i, elem) => {
        const user = $(elem).find('[class*="name"]').first().text().trim();
        const ratingText = $(elem).find('[aria-label*="star"]').attr('aria-label');
        const rating = ratingText ? parseInt(ratingText.match(/\d+/)?.[0] || 0) : 0;
        const text = $(elem).find('[class*="review-text"]').text().trim();
        const date = $(elem).find('[class*="date"]').text().trim();
        
        if (user || text) {
          reviews.push({ user: user || "Anonim", rating, text, date });
        }
      });
      
      // Alternatif selectors
      if (reviews.length === 0) {
        $('.review-full-text, .wiI7pd, [jsname]').each((i, elem) => {
          const text = $(elem).text().trim();
          if (text.length > 20) {
            reviews.push({
              user: "Google Kullanıcısı",
              rating: 0,
              text: text.substring(0, 500),
              date: "Tarih bilinmiyor"
            });
          }
        });
      }
    }
    
    // Trustpilot scraping
    else if (domain.includes("trustpilot.com")) {
      source = "Trustpilot";
      
      $('[data-service-review-card-paper]').each((i, elem) => {
        const user = $(elem).find('[data-consumer-name-typography]').text().trim();
        const ratingDiv = $(elem).find('[data-service-review-rating]');
        const rating = ratingDiv.find('img[alt*="star"]').length || 0;
        const text = $(elem).find('[data-service-review-text-typography]').text().trim();
        const date = $(elem).find('[data-service-review-date-time-ago]').text().trim();
        
        if (text) {
          reviews.push({ user: user || "Anonim", rating, text, date });
        }
      });
    }
    
    // Amazon scraping
    else if (domain.includes("amazon.")) {
      source = "Amazon";
      
      $('[data-hook="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="profile-name"]').text().trim();
        const ratingText = $(elem).find('[data-hook="review-star-rating"]').text();
        const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || 0);
        const text = $(elem).find('[data-hook="review-body"]').text().trim();
        const date = $(elem).find('[data-hook="review-date"]').text().trim();
        
        if (text) {
          reviews.push({ user, rating, text, date });
        }
      });
    }
    
    // Yelp scraping
    else if (domain.includes("yelp.com")) {
      source = "Yelp";
      
      $('[class*="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="user-name"]').text().trim();
        const ratingDiv = $(elem).find('[aria-label*="star"]');
        const rating = parseFloat(ratingDiv.attr('aria-label')?.match(/[\d.]+/)?.[0] || 0);
        const text = $(elem).find('p[class*="comment"]').text().trim();
        const date = $(elem).find('[class*="date"]').text().trim();
        
        if (text) {
          reviews.push({ user, rating, text, date });
        }
      });
    }
    
    // TripAdvisor scraping
    else if (domain.includes("tripadvisor.")) {
      source = "TripAdvisor";
      
      $('[data-automation="reviewCard"]').each((i, elem) => {
        const user = $(elem).find('[class*="username"]').text().trim();
        const ratingDiv = $(elem).find('[class*="rating"]');
        const rating = parseInt(ratingDiv.attr('class')?.match(/\d+/)?.[0] || 0);
        const text = $(elem).find('[data-automation="reviewText"]').text().trim();
        const date = $(elem).find('[class*="date"]').text().trim();
        
        if (text) {
          reviews.push({ user, rating, text, date });
        }
      });
    }
    
    // Generic scraping for other sites
    else {
      source = "Genel Web Sitesi";
      
      // Try to find review-like content
      const reviewSelectors = [
        '[class*="review"]',
        '[class*="comment"]',
        '[class*="feedback"]',
        '[class*="testimonial"]',
        '[itemprop="review"]'
      ];
      
      reviewSelectors.forEach(selector => {
        $(selector).each((i, elem) => {
          const text = $(elem).text().trim();
          if (text.length > 30 && text.length < 2000) {
            reviews.push({
              user: "Kullanıcı",
              rating: 0,
              text: text.substring(0, 500),
              date: new Date().toISOString().split('T')[0]
            });
          }
        });
      });
    }
    
    // If no reviews found, return error
    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: "Bu siteden yorum çekilemedi. Site dinamik JavaScript kullanıyor olabilir.",
        suggestion: "Google Maps, Trustpilot, Amazon, Yelp veya TripAdvisor URL'si deneyin."
      });
    }
    
    // Limit to 50 reviews
    reviews = reviews.slice(0, 50);
    
    return res.status(200).json({
      source,
      url,
      reviewCount: reviews.length,
      reviews
    });
    
  } catch (err) {
    console.error("Scraping hatası:", err);
    return res.status(500).json({ 
      error: "Veri çekme hatası: " + err.message,
      details: "Web sitesi erişilemez veya scraping engellenmiş olabilir."
    });
  }
}