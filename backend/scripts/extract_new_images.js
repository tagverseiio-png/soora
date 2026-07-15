const axios = require('axios');

const urls = [
  "https://threeangelstrading.com/product/tiger-beer-slim-cans-320ml-x-24/",
  "https://www.thebottleclub.com/products/kingfisher-nrb",
  "https://www.lazada.sg/products/bundle-of-24320ml-heineken-slim-can-carton-sale-i2725694563.html",
  "https://whisky.my/product/guinness-stout-beer-320ml-x-24/",
  "https://rvdrinks.com/products/guinness-draught-beer-can-4-x-440ml",
  "https://supercellar.ae/carlsberg-beer-can-500ml-case-of-24/",
  "https://www.amazon.sg/Anchor-Strong-Pilsner-Beer-490ml/dp/B0070099LO"
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function fetchImages() {
  for (const url of urls) {
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      const html = response.data;
      
      const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) || 
                           html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i) ||
                           html.match(/<img[^>]+id="landingImage"[^>]+src="([^"]+)"/i); // for amazon

      if (ogImageMatch) {
        console.log(`[OK] ${url}\n     Image: ${ogImageMatch[1]}`);
      } else {
        console.log(`[NO MATCH] ${url}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${url}: ${e.message}`);
    }
  }
}

fetchImages();
