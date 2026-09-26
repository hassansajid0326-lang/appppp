import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {'User-Agent': 'FitnessApp/1.0 (culinary_image_verification@app.com)'}

def search_wiki(query):
    url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=5&prop=pageimages&format=json&pithumbsize=800"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if 'query' in data and 'pages' in data['query']:
                res = []
                for pid, pdata in data['query']['pages'].items():
                    if 'thumbnail' in pdata:
                        res.append({"title": pdata.get('title'), "thumb": pdata['thumbnail']['source']})
                return res
    except Exception as e:
        print(f"Error {query}: {e}")
    return []

queries = [
    "Roasted chickpea", "Chana snack", "Almond snack", "Smoked salmon", "Tuna salad",
    "Boiled egg", "Egg white frittata", "Gyūdon", "Tilapia food", "Cottage cheese",
    "Oatmeal porridge", "Palak paneer", "Rice cake", "Tofu scramble", "Acai bowl",
    "Chia seed pudding", "Dark chocolate", "Energy bar bliss ball", "Avocado egg",
    "Chicken salad", "Steak", "Egg bhurji", "Keema", "Fish tikka", "Shami kebab",
    "Makhana", "Shakshouka", "Labneh", "Souvlaki", "Seabass food", "Roast chicken thighs",
    "Hummus"
]

results = {}
for q in queries:
    res = search_wiki(q)
    results[q] = res
    print(f"=== Query: {q} ===")
    for r in res:
        print(f"  [{r['title']}]: {r['thumb']}")

with open('apps/mobile/food_verify/wiki_search_results.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)
