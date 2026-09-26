const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = './test_photos';
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

// Curated verified Wikipedia & Commons high-quality food photographs
const photoCandidates = {
  'food-nv-bf-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/2014_smoked_salmon_and_egg_salad_toasted_baguette.JPG/800px-2014_smoked_salmon_and_egg_salad_toasted_baguette.JPG',
  'food-nv-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Soft-boiled-egg.jpg/800px-Soft-boiled-egg.jpg',
  'food-hp-bf-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Frittata02.jpg/800px-Frittata02.jpg',
  'food-hp-ln-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Gyuu-don_001.jpg/800px-Gyuu-don_001.jpg',
  'food-hp-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Cottagecheese200px.jpg/800px-Cottagecheese200px.jpg',
  'food-veg-bf-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Oatmeal.jpg/800px-Oatmeal.jpg',
  'food-veg-dn-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Palakpaneer_Rayagada_Odisha_0009.jpg/800px-Palakpaneer_Rayagada_Odisha_0009.jpg',
  'food-veg-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Chickpea_BNC.jpg/800px-Chickpea_BNC.jpg',
  'food-veg-wo-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rice_cake_with_peanut_butter.jpg/800px-Rice_cake_with_peanut_butter.jpg',
  'food-vg-bf-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Tofu_scramble_breakfast.jpg/800px-Tofu_scramble_breakfast.jpg',
  'food-vg-bf-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Acai_Bowl_%2827101831872%29.jpg/800px-Acai_Bowl_%2827101831872%29.jpg',
  'food-vg-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Chia_seed_pudding_with_berries.jpg/800px-Chia_seed_pudding_with_berries.jpg',
  'food-vg-sn-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Dark_chocolate_pieces.jpg/800px-Dark_chocolate_pieces.jpg',
  'food-vg-wo-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Energy_balls.jpg/800px-Energy_balls.jpg',
  'food-kt-bf-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Avocado_baked_eggs.jpg/800px-Avocado_baked_eggs.jpg',
  'food-kt-dn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Steak_with_shitaki_mushrooms.jpg/800px-Steak_with_shitaki_mushrooms.jpg',
  'food-kt-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Mixed_nuts.jpg/800px-Mixed_nuts.jpg',
  'food-ds-bf-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Egg_Bhurji.jpg/800px-Egg_Bhurji.jpg',
  'food-ds-bf-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Dosa_chutney_sambar.jpg/800px-Dosa_chutney_sambar.jpg',
  'food-ds-ln-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Keema_Matar.jpg/800px-Keema_Matar.jpg',
  'food-ds-dn-03': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Fish_Tikka_Kabab.jpg/800px-Fish_Tikka_Kabab.jpg',
  'food-ds-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Shami_kebab_02.jpg/800px-Shami_kebab_02.jpg',
  'food-ds-sn-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Phool_Makhana_Snack.jpg/800px-Phool_Makhana_Snack.jpg',
  'food-md-bf-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Shakshuka_by_Calliopejen1.jpg/800px-Shakshuka_by_Calliopejen1.jpg',
  'food-md-ln-02': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Souvlaki_skewer.jpg/800px-Souvlaki_skewer.jpg',
  'food-md-dn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Grilled_sea_bass.jpg/800px-Grilled_sea_bass.jpg',
  'food-md-sn-01': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Lebanese_style_hummus.jpg/800px-Lebanese_style_hummus.jpg'
};

async function download(id, url) {
  return new Promise((resolve) => {
    const filename = path.join(dir, id + '.jpg');
    const file = fs.createWriteStream(filename);
    https.get(url, { headers: { 'User-Agent': 'FitnessApp/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'FitnessApp/1.0' } }, (res2) => {
          res2.pipe(file);
          file.on('finish', () => { file.close(); resolve({ id, ok: true }); });
        }).on('error', () => resolve({ id, ok: false }));
      } else if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve({ id, ok: true }); });
      } else {
        resolve({ id, ok: false, status: res.statusCode });
      }
    }).on('error', () => resolve({ id, ok: false }));
  });
}

(async () => {
  console.log('Testing and downloading candidates...');
  for (const [id, url] of Object.entries(photoCandidates)) {
    const res = await download(id, url);
    console.log(id, '->', res.ok ? 'SUCCESS' : 'FAILED: ' + res.status);
  }
})();
