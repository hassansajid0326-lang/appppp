import urllib.request
import urllib.parse
import json
import ssl
import time
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {
    'User-Agent': 'FitnessCoachNutritionBot/2.0 (https://fitnessapp.io; contact@fitnessapp.io)'
}

os.makedirs('apps/mobile/final_food_images', exist_ok=True)

def fetch_wiki_search(query):
    time.sleep(0.3)
    url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=3&prop=pageimages&format=json&pithumbsize=800"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'query' in data and 'pages' in data['query']:
                res = []
                for pid, pdata in data['query']['pages'].items():
                    if 'thumbnail' in pdata:
                        res.append({"title": pdata.get('title'), "thumb": pdata['thumbnail']['source']})
                return res
    except Exception as e:
        print(f"Err {query}: {e}")
    return []

def download(url, out):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp, open(out, 'wb') as f:
            f.write(resp.read())
        return True
    except Exception as e:
        print(f"Err downloading {url}: {e}")
        return False

# Target dishes and search queries
queries_map = {
    "food-veg-sn-01": "Roasted chickpea",
    "food-nv-bf-02": "Lox",
    "food-nv-sn-01": "Boiled egg",
    "food-vg-bf-01": "Tofu scramble",
    "food-vg-bf-02": "Açai bowl",
    "food-vg-sn-01": "Chia seed",
    "food-vg-sn-02": "Dark chocolate",
    "food-kt-bf-02": "Avocado egg",
    "food-kt-sn-01": "Macadamia",
    "food-ds-ln-02": "Keema",
    "food-ds-sn-02": "Makhana",
    "food-md-bf-02": "Labneh",
    "food-md-dn-01": "European seabass",
    "food-md-dn-02": "Roast chicken",
    "food-md-wo-01": "Strained yogurt"
}

results = {}
for id, q in queries_map.items():
    print(f"Searching for {id}: {q}...")
    res = fetch_wiki_search(q)
    if res:
        for idx, item in enumerate(res):
            out_fn = f"apps/mobile/final_food_images/{id}_res{idx+1}.jpg"
            print(f"  Downloading {item['title']} -> {out_fn}")
            if download(item['thumb'], out_fn):
                if id not in results:
                    results[id] = []
                results[id].append({"title": item['title'], "thumb": item['thumb'], "local": out_fn})

with open('apps/mobile/final_food_images/results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("Finished fetching all target dish images!")
