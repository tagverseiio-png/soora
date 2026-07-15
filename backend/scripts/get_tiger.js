const axios = require('axios');
const https = require('https');

const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function run() {
  const urls = ["https://threeangelstrading.com/product/tiger-beer-slim-cans-320ml-x-24/"];
  for (const url of urls) {
    try {
      const resp = await axios.get(url, { httpsAgent: agent, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = resp.data;
      const og = html.match(/og:image" content="([^"]+)"/i);
      console.log(`URL: ${url}\nImage: ${og ? og[1] : 'Not Found'}`);
    } catch (e) {
      console.log('Error', e.message);
    }
  }
}
run();
