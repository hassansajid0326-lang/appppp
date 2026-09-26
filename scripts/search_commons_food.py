import urllib.request
import urllib.parse
import json
import ssl
import os

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FitnessApp/1.0'}

os.makedirs('apps/mobile/final_food_images', exist_ok=True)

# Wikimedia search function to get exact image files
def search_commons(query):
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'query' in data and 'pages' in data['query']:
                res = []
                for pid, pdata in data['query']['pages'].items():
                    if 'imageinfo' in pdata and len(pdata['imageinfo']) > 0:
                        info = pdata['imageinfo'][0]
                        thumb = info.get('thumburl') or info.get('url')
                        title = pdata.get('title')
                        res.append({"title": title, "url": thumb})
                return res
    except Exception as e:
        print(f"Commons search error for '{query}': {e}")
    return []

# High confidence food search terms on Wikimedia Commons and Unsplash
searches = {
    "food-veg-sn-01": ["roasted chickpeas snack", "roasted chana", "roasted almonds in bowl"],
    "food-nv-bf-02": ["lox on bagel", "smoked salmon toast", "smoked salmon egg breakfast"],
    "food-nv-ln-02": ["tuna salad bowl", "salade nicoise tuna", "tuna salad plate"],
    "food-nv-sn-01": ["hard boiled eggs cut in half", "soft-boiled egg halves", "boiled eggs bowl"],
    "food-vg-bf-01": ["tofu scramble toast", "scrambled tofu breakfast"],
    "food-vg-bf-02": ["acai bowl berries", "smoothie bowl granola"],
    "food-vg-sn-01": ["chia seed pudding berries", "chia pudding jar"],
    "food-vg-sn-02": ["dark chocolate bar broken pieces", "walnuts and dark chocolate"],
    "food-kt-bf-02": ["baked egg in avocado", "avocado egg boat"],
    "food-kt-sn-01": ["macadamia nuts bowl", "roasted mixed nuts bowl"],
    "food-ds-ln-02": ["keema matar curry", "qeema minced meat", "mutton keema"],
    "food-ds-sn-02": ["roasted makhana", "fox nuts snack", "phool makhana"],
    "food-md-bf-02": ["labneh toast olive oil", "feta tomato toast"],
    "food-md-dn-01": ["grilled whole sea bass", "grilled branzino fish"],
    "food-md-dn-02": ["roasted chicken thighs rosemary", "baked chicken thighs lemon"],
    "food-md-wo-01": ["greek yogurt walnuts honey", "figs yogurt honey bowl"]
}

commons_results = {}
for id, terms in searches.items():
    commons_results[id] = []
    for t in terms:
        res = search_commons(t)
        for r in res:
            if not r['url'].endswith('.svg') and not r['url'].endswith('.pdf'):
                commons_results[id].append(r)

with open('apps/mobile/final_food_images/commons_search.json', 'w', encoding='utf-8') as f:
    json.dump(commons_results, f, indent=2)

print("Commons search completed!")
