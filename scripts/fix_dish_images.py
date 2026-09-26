import urllib.request
import urllib.parse
import json
import os
import ssl
import time

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

os.makedirs('apps/mobile/food_verify', exist_ok=True)

def get_wiki_img(title):
    url = f'https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&format=json&pithumbsize=800'
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data['query']['pages']
            for k, v in pages.items():
                if 'thumbnail' in v:
                    return v['thumbnail']['source']
    except Exception as e:
        print(f'Wiki err for {title}: {e}')
    return None

def download_img(url, filepath):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp, open(filepath, 'wb') as f:
            f.write(resp.read())
        return True
    except Exception as e:
        print(f'Download err for {filepath} from {url}: {e}')
        return False

# Mapping of dishes to either Wikipedia titles or verified direct curated food images
dish_sources = {
    "food-veg-sn-01": {"name": "Roasted Chickpeas", "wiki": "Chana (snack)", "unsplash": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80"},
    "food-nv-bf-02": {"name": "Smoked Salmon Toast", "wiki": "Lox", "unsplash": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"},
    "food-nv-ln-02": {"name": "Tuna Salad Bowl", "wiki": "Tuna salad", "unsplash": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"},
    "food-nv-sn-01": {"name": "Hard Boiled Eggs", "wiki": "Hard-boiled egg", "unsplash": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80"},
    "food-hp-bf-01": {"name": "Egg White Frittata", "wiki": "Frittata", "unsplash": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop&q=80"},
    "food-hp-ln-01": {"name": "Beef Rice Power Bowl", "wiki": "Gyūdon", "unsplash": "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&auto=format&fit=crop&q=80"},
    "food-hp-dn-01": {"name": "Turkey Tenderloin Steaks", "wiki": "Turkey meat", "unsplash": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80"},
    "food-hp-dn-02": {"name": "Lemon Pepper Tilapia", "wiki": "Tilapia", "unsplash": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80"},
    "food-hp-sn-01": {"name": "Cottage Cheese Bowl", "wiki": "Cottage cheese", "unsplash": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80"},
    "food-veg-bf-02": {"name": "Peanut Butter Banana Oats", "wiki": "Oatmeal", "unsplash": "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80"},
    "food-veg-dn-02": {"name": "Palak Paneer", "wiki": "Palak paneer", "unsplash": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80"},
    "food-veg-wo-01": {"name": "Rice Cakes with PB & Berries", "wiki": "Puffed rice cake", "unsplash": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"},
    "food-vg-bf-01": {"name": "Tofu Scramble Toast", "wiki": "Tofu scramble", "unsplash": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"},
    "food-vg-bf-02": {"name": "Acai Smoothie Bowl", "wiki": "Açai bowl", "unsplash": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=800&auto=format&fit=crop&q=80"},
    "food-vg-sn-01": {"name": "Chia Seed Pudding", "wiki": "Chia seed", "unsplash": "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80"},
    "food-vg-sn-02": {"name": "Dark Chocolate & Walnuts", "wiki": "Dark chocolate", "unsplash": "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80"},
    "food-vg-wo-01": {"name": "Protein Energy Bites", "wiki": "Energy bar", "unsplash": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80"},
    "food-kt-bf-02": {"name": "Baked Eggs in Avocado", "wiki": "Avocado", "unsplash": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"},
    "food-kt-ln-01": {"name": "Chicken Avocado Salad", "wiki": "Chicken salad", "unsplash": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80"},
    "food-kt-dn-01": {"name": "Cast Iron Ribeye Steak", "wiki": "Rib eye steak", "unsplash": "https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80"},
    "food-kt-dn-02": {"name": "Wild Salmon Lemon Butter", "wiki": "Salmon as food", "unsplash": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80"},
    "food-kt-sn-01": {"name": "Macadamia Nuts", "wiki": "Macadamia", "unsplash": "https://images.unsplash.com/photo-1536591375685-645c719e7a88?w=800&auto=format&fit=crop&q=80"},
    "food-ds-bf-01": {"name": "Desi Anda Bhurji", "wiki": "Egg bhurji", "unsplash": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"},
    "food-ds-ln-02": {"name": "Mutton Qeema Matar", "wiki": "Keema", "unsplash": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80"},
    "food-ds-dn-03": {"name": "Tandoori Fish Tikka", "wiki": "Chicken tikka", "unsplash": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80"},
    "food-ds-sn-01": {"name": "Shami Kebabs", "wiki": "Shami kebab", "unsplash": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80"},
    "food-ds-sn-02": {"name": "Fox Nuts / Makhana", "wiki": "Euryale ferox", "unsplash": "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80"},
    "food-md-bf-01": {"name": "Skillet Shakshuka", "wiki": "Shakshouka", "unsplash": "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=80"},
    "food-md-bf-02": {"name": "Greek Labneh Feta Toast", "wiki": "Labneh", "unsplash": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"},
    "food-md-ln-02": {"name": "Chicken Souvlaki Skewers", "wiki": "Souvlaki", "unsplash": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80"},
    "food-md-dn-01": {"name": "Grilled Mediterranean Seabass", "wiki": "European seabass", "unsplash": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80"},
    "food-md-dn-02": {"name": "Rosemary Chicken Thighs", "wiki": "Roast chicken", "unsplash": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80"},
    "food-md-sn-01": {"name": "Hummus Bowl with Olive Oil", "wiki": "Hummus", "unsplash": "https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=800&auto=format&fit=crop&q=80"},
    "food-md-wo-01": {"name": "Fig Walnut Greek Yogurt", "wiki": "Strained yogurt", "unsplash": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80"}
}

results = {}
for id, info in dish_sources.items():
    print(f"Processing {id} ({info['name']})...")
    wiki_img = get_wiki_img(info['wiki'])
    if wiki_img:
        print(f"  Wiki found: {wiki_img}")
        out_path = f"apps/mobile/food_verify/{id}_wiki.jpg"
        if download_img(wiki_img, out_path):
            results[id] = {"type": "wiki", "url": wiki_img, "path": out_path}
    else:
        print(f"  No wiki for {info['wiki']}")

with open('apps/mobile/food_verify/results.json', 'w') as f:
    json.dump(results, f, indent=2)

print('Done querying Wikipedia for all items!')
