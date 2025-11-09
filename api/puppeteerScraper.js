import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL parametresi gerekli" });

  let browser = null;
  
  try {
    const domain = new URL(url).hostname;
    
    // Launch headless Chrome
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for dynamic content
    await page.waitForTimeout(3000);
    
    let reviews = [];
    let source = domain;
    
    // Hepsiburada scraping
    if (domain.includes('hepsiburada.com')) {
      source = "Hepsiburada";
      
      // Scroll to load more reviews
      await autoScroll(page);
      
      reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('[class*="review"], [itemprop="review"], .hermes-ReviewCard');
        const results = [];
        
        reviewElements.forEach(elem => {
          const user = elem.querySelector('[class*="username"], [itemprop="author"], .hermes-ReviewCard-module-username')?.textContent.trim() || "Kullanıcı";
          const ratingElem = elem.querySelector('[itemprop="ratingValue"], [class*="rating"]');
          const rating = parseFloat(ratingElem?.textContent || ratingElem?.getAttribute('content') || '0');
          const text = elem.querySelector('[itemprop="reviewBody"], [class*="review-text"], .hermes-ReviewCard-module-comment')?.textContent.trim();
          const date = elem.querySelector('[itemprop="datePublished"], [class*="date"]')?.textContent.trim() || "Tarih bilinmiyor";
          
          if (text && text.length > 10) {
            results.push({ user, rating, text: text.substring(0, 500), date });
          }
        });
        
        return results;
      });
    }
    
    // Yemeksepeti scraping
    else if (domain.includes('yemeksepeti.com')) {
      source = "Yemeksepeti";
      
      await autoScroll(page);
      
      reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('[class*="review"], [class*="comment"], [data-testid*="review"]');
        const results = [];
        
        reviewElements.forEach(elem => {
          const user = elem.querySelector('[class*="user-name"], [class*="author"]')?.textContent.trim() || "Yemeksepeti Kullanıcısı";
          const ratingElem = elem.querySelector('[class*="rating"], [class*="star"]');
          const ratingText = ratingElem?.textContent || ratingElem?.getAttribute('aria-label') || '0';
          const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');
          const text = elem.querySelector('[class*="comment-text"], [class*="review-text"], p')?.textContent.trim();
          const date = elem.querySelector('[class*="date"], time')?.textContent.trim() || "Tarih bilinmiyor";
          
          if (text && text.length > 10) {
            results.push({ user, rating, text: text.substring(0, 500), date });
          }
        });
        
        return results;
      });
    }
    
    // Trendyol scraping
    else if (domain.includes('trendyol.com')) {
      source = "Trendyol";
      
      // Click "Yorumları Gör" button if exists
      try {
        await page.click('[class*="show-reviews"], [class*="yorumları-gör"]', { timeout: 3000 });
        await page.waitForTimeout(2000);
      } catch (e) {}
      
      await autoScroll(page);
      
      reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('[class*="comment"], [class*="review-item"]');
        const results = [];
        
        reviewElements.forEach(elem => {
          const user = elem.querySelector('[class*="user-name"]')?.textContent.trim() || "Trendyol Kullanıcısı";
          const ratingDiv = elem.querySelector('[class*="rating"]');
          const rating = parseFloat(ratingDiv?.textContent.match(/[\d.]+/)?.[0] || '0');
          const text = elem.querySelector('[class*="comment-text"]')?.textContent.trim();
          const date = elem.querySelector('[class*="comment-date"]')?.textContent.trim() || "Tarih bilinmiyor";
          
          if (text && text.length > 10) {
            results.push({ user, rating, text: text.substring(0, 500), date });
          }
        });
        
        return results;
      });
    }
    
    // Google Maps scraping
    else if (domain.includes('google.com')) {
      source = "Google Maps";
      
      // Scroll reviews section
      await autoScroll(page, '[class*="review"]');
      
      reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('[data-review-id], [class*="review"]');
        const results = [];
        
        reviewElements.forEach(elem => {
          const user = elem.querySelector('[class*="reviewer"], [class*="name"]')?.textContent.trim() || "Google Kullanıcısı";
          const ratingElem = elem.querySelector('[aria-label*="star"], [class*="rating"]');
          const ratingText = ratingElem?.getAttribute('aria-label') || '0';
          const rating = parseFloat(ratingText.match(/[\d.]+/)?.[0] || '0');
          const text = elem.querySelector('[class*="review-text"], [class*="wiI7pd"]')?.textContent.trim();
          const date = elem.querySelector('[class*="review-date"]')?.textContent.trim() || "Tarih bilinmiyor";
          
          if (text && text.length > 10) {
            results.push({ user, rating, text: text.substring(0, 500), date });
          }
        });
        
        return results;
      });
    }
    
    // Generic scraping for other sites
    else {
      source = "Genel Web Sitesi";
      
      await autoScroll(page);
      
      reviews = await page.evaluate(() => {
        const selectors = [
          '[class*="review"]',
          '[class*="comment"]',
          '[class*="feedback"]',
          '[class*="testimonial"]',
          '[itemprop="review"]'
        ];
        
        const results = [];
        
        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(elem => {
            const text = elem.textContent?.trim();
            if (text && text.length > 30 && text.length < 2000) {
              results.push({
                user: "Kullanıcı",
                rating: 0,
                text: text.substring(0, 500),
                date: new Date().toISOString().split('T')[0]
              });
            }
          });
        });
        
        return results;
      });
    }
    
    await browser.close();
    
    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: "Bu siteden yorum çekilemedi",
        suggestion: "Farklı bir URL deneyin veya yorumların yüklenmesini bekleyin."
      });
    }
    
    // Limit to 50 reviews
    reviews = reviews.slice(0, 50);
    
    return res.status(200).json({
      source,
      url,
      reviewCount: reviews.length,
      reviews,
      method: "Puppeteer (Browser Automation)"
    });
    
  } catch (err) {
    if (browser) await browser.close();
    
    console.error("Puppeteer hatası:", err);
    return res.status(500).json({ 
      error: "Scraping hatası: " + err.message,
      details: "Tarayıcı başlatılamadı veya sayfa yüklenemedi."
    });
  }
}

// Auto scroll function to load lazy content
async function autoScroll(page, selector = null) {
  await page.evaluate(async (sel) => {
    const element = sel ? document.querySelector(sel) : document.body;
    if (!element) return;
    
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = element.scrollHeight || document.body.scrollHeight;
        element.scrollBy?.(0, distance) || window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 5000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }, selector);
}