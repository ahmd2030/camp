const cheerio = require('cheerio');

async function test() {
  const query = 'openai news';
  const response = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  const text = await response.text();
  const $ = cheerio.load(text);
  
  const results = [];
  $('.result').each((i, el) => {
    const title = $(el).find('.result__title').text().trim();
    const snippet = $(el).find('.result__snippet').text().trim();
    if (title && snippet) {
      results.push({ title, snippet });
    }
  });
  
  console.log(JSON.stringify(results.slice(0, 3), null, 2));
}

test().catch(console.error);
