import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  try {
    const domain = new URL(url).hostname;
    
    // Fetch HTML content with more headers to avoid blocking
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });
    
    if (!response.ok) {
      // Try alternative scraping service for blocked sites
      return await scrapeWithAlternative(url, domain, res);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let reviews = [];
    let source = domain;
    
    // Yemeksepeti scraping
    if (domain.includes("yemeksepeti.com")) {
      source = "Yemeksepeti";
      
      // Yemeksepeti review selectors
      $('[class*="review"], [class*="comment"], [data-testid*="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="user"], [class*="name"]').text().trim();
        const ratingDiv = $(elem).find('[class*="rating"], [class*="star"]');
        const rating = parseFloat(ratingDiv.text().match(/[\d.]+/)?.[0] || 0);
        const text = $(elem).find('[class*="text"], [class*="content"], p').text().trim();
        const date = $(elem).find('[class*="date"], [class*="time"]').text().trim();
        
        if (text && text.length > 10) {
          reviews.push({ 
            user: user || "Yemeksepeti Kullanıcısı", 
            rating: rating || 0, 
            text: text.substring(0, 500), 
            date: date || "Tarih bilinmiyor" 
          });
        }
      });
    }
    
    // Trendyol scraping
    else if (domain.includes("trendyol.com")) {
      source = "Trendyol";
      
      $('[class*="comment"], [class*="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="user-name"]').text().trim();
        const ratingDiv = $(elem).find('[class*="rating"]');
        const rating = parseFloat(ratingDiv.text().match(/[\d.]+/)?.[0] || 0);
        const text = $(elem).find('[class*="comment-text"]').text().trim();
        const date = $(elem).find('[class*="comment-date"]').text().trim();
        
        if (text) {
          reviews.push({ user: user || "Trendyol Kullanıcısı", rating, text, date });
        }
      });
    }
    
    // Hepsiburada scraping
    else if (domain.includes("hepsiburada.com")) {
      source = "Hepsiburada";
      
      $('[class*="review"], [itemprop="review"]').each((i, elem) => {
        const user = $(elem).find('[itemprop="author"], [class*="username"]').text().trim();
        const rating = parseFloat($(elem).find('[itemprop="ratingValue"]').text() || 0);
        const text = $(elem).find('[itemprop="reviewBody"], [class*="review-text"]').text().trim();
        const date = $(elem).find('[itemprop="datePublished"]').text().trim();
        
        if (text) {
          reviews.push({ user, rating, text, date });
        }
      });
    }
    
    // Sikayetvar scraping
    else if (domain.includes("sikayetvar.com")) {
      source = "Şikayetvar";
      
      $('[class*="complaint"], [class*="card"]').each((i, elem) => {
        const user = $(elem).find('[class*="username"], [class*="author"]').text().trim();
        const text = $(elem).find('[class*="complaint-text"], [class*="description"]').text().trim();
        const date = $(elem).find('[class*="date"]').text().trim();
        
        if (text && text.length > 20) {
          reviews.push({ user, rating: 0, text: text.substring(0, 500), date });
        }
      });
    }
    
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
        error: "Bu siteden yorum çekilemedi. Site JavaScript ile dinamik içerik yüklüyor olabilir.",
        suggestion: "Google Maps, Trustpilot, Amazon, Yelp, TripAdvisor, Yemeksepeti, Trendyol, Hepsiburada veya Şikayetvar URL'si deneyin.",
        debug: {
          domain,
          htmlLength: html.length,
          foundElements: {
            reviews: $('[class*="review"]').length,
            comments: $('[class*="comment"]').length,
            feedback: $('[class*="feedback"]').length
          }
        }
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
      details: "Web sitesi erişilemez, CORS engeli var veya scraping engellenmiş olabilir.",
      suggestion: "Farklı bir URL deneyin veya tarayıcı extension'ı kullanın."
    });
  }
}

// Alternative scraping method for blocked sites
async function scrapeWithAlternative(url, domain, res) {
  // Return mock data for demonstration
  const mockReviews = [
    {
      user: "Demo Kullanıcı 1",
      rating: 4,
      text: "Bu site anti-scraping koruması kullandığı için gerçek veriler çekilemiyor. Ancak sistem çalışıyor!",
      date: new Date().toISOString().split('T')[0]
    },
    {
      user: "Demo Kullanıcı 2",
      rating: 5,
      text: "Gerçek scraping için Puppeteer veya API entegrasyonu gerekiyor.",
      date: new Date().toISOString().split('T')[0]
    },
    {
      user: "Demo Kullanıcı 3",
      rating: 3,
      text: "Yemeksepeti, Trendyol gibi siteler JavaScript ile içerik yüklediği için basit fetch yeterli olmuyor.",
      date: new Date().toISOString().split('T')[0]
    }
  ];
  
  return res.status(200).json({
    source: domain + " (Demo Mode)",
    url,
    reviewCount: mockReviews.length,
    reviews: mockReviews,
    warning: "Bu site scraping koruması kullanıyor. Demo veriler gösteriliyor."
  });
}