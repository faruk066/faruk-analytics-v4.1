import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
  
  if (!SCRAPER_API_KEY) {
    console.warn("ScraperAPI key not found, falling back to direct fetch");
    // Fallback to direct fetch without ScraperAPI
    return await directFetch(url, res);
  }

  try {
    const domain = new URL(url).hostname;
    
    // Build ScraperAPI URL
    const scraperApiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true&country_code=tr`;
    
    console.log('Fetching with ScraperAPI:', domain);
    
    // Fetch through ScraperAPI (handles JS rendering, proxies, etc.)
    const response = await fetch(scraperApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (!response.ok) {
      throw new Error(`ScraperAPI error: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let reviews = [];
    let source = domain;
    
    // Hepsiburada scraping
    if (domain.includes('hepsiburada.com')) {
      source = "Hepsiburada";
      
      $('[class*="review"], [itemprop="review"], .hermes-ReviewCard').each((i, elem) => {
        const user = $(elem).find('[class*="username"], [itemprop="author"], .hermes-ReviewCard-module-username').text().trim() || "Kullanıcı";
        const ratingElem = $(elem).find('[itemprop="ratingValue"], [class*="rating"]');
        const rating = parseFloat(ratingElem.text() || ratingElem.attr('content') || '0');
        const text = $(elem).find('[itemprop="reviewBody"], [class*="review-text"], .hermes-ReviewCard-module-comment').text().trim();
        const date = $(elem).find('[itemprop="datePublished"], [class*="date"]').text().trim() || "Tarih bilinmiyor";
        
        if (text && text.length > 10) {
          reviews.push({ user, rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Yemeksepeti scraping
    else if (domain.includes('yemeksepeti.com')) {
      source = "Yemeksepeti";
      
      $('[class*="review"], [class*="comment"], [data-testid*="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="user-name"], [class*="author"]').text().trim() || "Yemeksepeti Kullanıcısı";
        const ratingElem = $(elem).find('[class*="rating"], [class*="star"]');
        const ratingText = ratingElem.text() || ratingElem.attr('aria-label') || '0';
        const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');
        const text = $(elem).find('[class*="comment-text"], [class*="review-text"], p').text().trim();
        const date = $(elem).find('[class*="date"], time').text().trim() || "Tarih bilinmiyor";
        
        if (text && text.length > 10) {
          reviews.push({ user, rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Trendyol scraping
    else if (domain.includes('trendyol.com')) {
      source = "Trendyol";
      
      $('[class*="comment"], [class*="review-item"]').each((i, elem) => {
        const user = $(elem).find('[class*="user-name"]').text().trim() || "Trendyol Kullanıcısı";
        const ratingDiv = $(elem).find('[class*="rating"]');
        const rating = parseFloat(ratingDiv.text().match(/[\d.]+/)?.[0] || '0');
        const text = $(elem).find('[class*="comment-text"]').text().trim();
        const date = $(elem).find('[class*="comment-date"]').text().trim() || "Tarih bilinmiyor";
        
        if (text && text.length > 10) {
          reviews.push({ user, rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Google Maps scraping
    else if (domain.includes('google.com')) {
      source = "Google Maps";
      
      $('[data-review-id], [jsname], [class*="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="reviewer"], [class*="name"]').text().trim() || "Google Kullanıcısı";
        const ratingElem = $(elem).find('[aria-label*="star"], [class*="rating"]');
        const ratingText = ratingElem.attr('aria-label') || '0';
        const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');
        const text = $(elem).find('[class*="review-text"], [class*="wiI7pd"], [jsname]').text().trim();
        const date = $(elem).find('[class*="review-date"]').text().trim() || "Tarih bilinmiyor";
        
        if (text && text.length > 10) {
          reviews.push({ user, rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Amazon scraping
    else if (domain.includes('amazon.')) {
      source = "Amazon";
      
      $('[data-hook="review"]').each((i, elem) => {
        const user = $(elem).find('[class*="profile-name"]').text().trim();
        const ratingText = $(elem).find('[data-hook="review-star-rating"]').text();
        const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || 0);
        const text = $(elem).find('[data-hook="review-body"]').text().trim();
        const date = $(elem).find('[data-hook="review-date"]').text().trim();
        
        if (text) {
          reviews.push({ user, rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Trustpilot scraping
    else if (domain.includes('trustpilot.com')) {
      source = "Trustpilot";
      
      $('[data-service-review-card-paper]').each((i, elem) => {
        const user = $(elem).find('[data-consumer-name-typography]').text().trim();
        const ratingDiv = $(elem).find('[data-service-review-rating]');
        const rating = ratingDiv.find('img[alt*="star"]').length || 0;
        const text = $(elem).find('[data-service-review-text-typography]').text().trim();
        const date = $(elem).find('[data-service-review-date-time-ago]').text().trim();
        
        if (text) {
          reviews.push({ user: user || "Anonim", rating, text: text.substring(0, 500), date });
        }
      });
    }
    
    // Şikayetvar scraping
    else if (domain.includes('sikayetvar.com')) {
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
    
    // Generic scraping for other sites
    else {
      source = "Genel Web Sitesi";
      
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
    
    // If no reviews found
    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: "Bu siteden yorum çekilemedi",
        suggestion: "Site yapısı desteklenmiyor veya yorumlar farklı formatta olabilir.",
        debug: {
          domain,
          htmlLength: html.length,
          foundElements: {
            reviews: $('[class*="review"]').length,
            comments: $('[class*="comment"]').length
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
      reviews,
      method: "ScraperAPI (JS Rendering)",
      info: "1000 ücretsiz request/ay kullanılıyor"
    });
    
  } catch (err) {
    console.error("ScraperAPI error:", err);
    return res.status(500).json({ 
      error: "Scraping hatası: " + err.message,
      details: "ScraperAPI ile veri çekilemedi. API limiti dolmuş olabilir veya site erişilemez."
    });
  }
}

// Direct fetch fallback when ScraperAPI key is not available
async function directFetch(url, res) {
  try {
    const domain = new URL(url).hostname;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    if (!response.ok) {
      return res.status(200).json({
        source: domain + " (Demo Mode)",
        url,
        reviewCount: 3,
        reviews: [
          {
            user: "Demo Kullanıcı",
            rating: 4,
            text: "ScraperAPI key tanımlanmadığı için demo veriler gösteriliyor. Gerçek scraping için Environment Variables'a SCRAPER_API_KEY ekleyin.",
            date: new Date().toISOString().split('T')[0]
          },
          {
            user: "Bilgilendirme",
            rating: 3,
            text: "www.scraperapi.com adresinden ücretsiz hesap oluşturup API key alabilirsiniz (1000 request/month free).",
            date: new Date().toISOString().split('T')[0]
          },
          {
            user: "Alternatif",
            rating: 5,
            text: "ScraperAPI olmadan statik HTML siteleri için 'Hızlı (Cheerio)' modunu kullanabilirsiniz.",
            date: new Date().toISOString().split('T')[0]
          }
        ],
        method: "Demo Mode (No ScraperAPI Key)",
        warning: "ScraperAPI key bulunamadı. Demo veriler gösteriliyor."
      });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let reviews = [];
    
    // Basic scraping logic (same as main function but without ScraperAPI)
    $('[class*="review"], [class*="comment"]').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length > 30 && text.length < 1000) {
        reviews.push({
          user: "Kullanıcı",
          rating: 0,
          text: text.substring(0, 500),
          date: new Date().toISOString().split('T')[0]
        });
      }
    });
    
    if (reviews.length === 0) {
      return res.status(200).json({
        source: domain + " (Demo Mode)",
        url,
        reviewCount: 1,
        reviews: [{
          user: "Sistem",
          rating: 0,
          text: "Bu siteden veri çekilemedi. JavaScript tabanlı dinamik içerik kullanıyor olabilir. ScraperAPI kullanmanız önerilir.",
          date: new Date().toISOString().split('T')[0]
        }],
        method: "Direct Fetch (No ScraperAPI)",
        warning: "ScraperAPI olmadan bu siteden veri çekilemedi"
      });
    }
    
    return res.status(200).json({
      source: domain,
      url,
      reviewCount: reviews.length,
      reviews: reviews.slice(0, 20),
      method: "Direct Fetch (No ScraperAPI Key)",
      warning: "ScraperAPI key olmadan temel scraping yapıldı. Tam özellik için API key ekleyin."
    });
    
  } catch (err) {
    return res.status(500).json({
      error: "Direct fetch hatası: " + err.message,
      suggestion: "ScraperAPI key ekleyin veya 'Hızlı (Cheerio)' modunu deneyin"
    });
  }
}