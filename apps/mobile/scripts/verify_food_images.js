const https = require('https');
const fs = require('fs');

const content = fs.readFileSync('src/lib/foodDatabase.ts', 'utf8');
const regex = /id:\s*'([^']+)',\s*name:\s*'([^']+)'[\s\S]*?image_url:\s*'https:\/\/images\.unsplash\.com\/([^?']+)/g;

let match;
const items = [];
while ((match = regex.exec(content)) !== null) {
  items.push({
    id: match[1],
    name: match[2],
    photoId: match[3]
  });
}

console.log('Total items to inspect:', items.length);

async function inspectPhoto(photoId) {
  return new Promise((resolve) => {
    const url = 'https://unsplash.com/photos/' + photoId;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const titleMatch = data.match(/<title>([^<]+)<\/title>/);
        const descMatch = data.match(/<meta property="og:title" content="([^"]+)"/);
        resolve({
          title: titleMatch ? titleMatch[1].replace(' | Download Free Images on Unsplash', '').replace(' | Unsplash', '') : '',
          og: descMatch ? descMatch[1] : ''
        });
      });
    }).on('error', () => resolve({ title: 'ERROR', og: 'ERROR' }));
  });
}

(async () => {
  for (const item of items) {
    const meta = await inspectPhoto(item.photoId);
    console.log(`[${item.id}] ${item.name}`);
    console.log(`   PhotoId: ${item.photoId}`);
    console.log(`   Unsplash Title: ${meta.title}`);
    console.log('---');
    await new Promise(r => setTimeout(r, 150));
  }
})();
