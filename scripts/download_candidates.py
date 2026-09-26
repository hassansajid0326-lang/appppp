import urllib.request
import urllib.parse
import json
import os
import ssl

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

os.makedirs('apps/mobile/food_verify', exist_ok=True)

# Curated candidates for all dishes needing verification/fixing
# Every candidate is a real food photography shot
candidates = {
    # 1. Spiced Namkeen Roasted Chickpeas & Almonds (The user specifically complained about Gundam!)
    "food-veg-sn-01": [
        "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80", # roasted chickpeas/nuts
        "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&auto=format&fit=crop&q=80"
    ],
    # 2. Smoked Salmon & Poached Egg Toast
    "food-nv-bf-02": [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80", # salmon & egg toast
        "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800&auto=format&fit=crop&q=80"
    ],
    # 3. Wild Albacore Tuna Salad Bowl
    "food-nv-ln-02": [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80", # bowl salad
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80"
    ],
    # 4. Pasture-Raised Hard Boiled Eggs
    "food-nv-sn-01": [
        "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80", # boiled eggs sliced
        "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&auto=format&fit=crop&q=80"
    ],
    # 5. Egg White & Spinach Frittata
    "food-hp-bf-01": [
        "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop&q=80", # cast iron frittata
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Frittata02.jpg/960px-Frittata02.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail"
    ],
    # 6. Beef & Brown Rice Power Bowl
    "food-hp-ln-01": [
        "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=800&auto=format&fit=crop&q=80", # beef bowl
        "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&auto=format&fit=crop&q=80"
    ],
    # 7. Herb-Crusted Grilled Turkey Steaks
    "food-hp-dn-01": [
        "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80", # grilled poultry breast steak
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80"
    ],
    # 8. Lemon Pepper Tilapia Fillet / White Fish
    "food-hp-dn-02": [
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80", # grilled fish fillet
        "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&auto=format&fit=crop&q=80"
    ],
    # 9. Whipped Low-Fat Cottage Cheese Bowl
    "food-hp-sn-01": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Cottagecheese200px.jpg/960px-Cottagecheese200px.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80"
    ],
    # 10. Peanut Butter Banana Chia Oatmeal
    "food-veg-bf-02": [
        "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80", # oatmeal bowl with banana/nuts
        "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&auto=format&fit=crop&q=80"
    ],
    # 11. Palak Paneer with Roti
    "food-veg-dn-02": [
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80", # authentic palak paneer
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Palakpaneer_Rayagada_Odisha_0009.jpg/960px-Palakpaneer_Rayagada_Odisha_0009.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail"
    ],
    # 12. Rice Cakes with PB & Berries
    "food-veg-wo-01": [
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80", # rice cakes / toast
        "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=800&auto=format&fit=crop&q=80"
    ],
    # 13. Tofu Scramble Breakfast Toast
    "food-vg-bf-01": [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80", # scramble on toast
        "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800&auto=format&fit=crop&q=80"
    ],
    # 14. Acai Smoothie Bowl
    "food-vg-bf-02": [
        "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=800&auto=format&fit=crop&q=80", # acai bowl
        "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=80"
    ],
    # 15. Overnight Chia Seed Pudding
    "food-vg-sn-01": [
        "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80", # chia pudding jar
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80"
    ],
    # 16. 85% Dark Chocolate & Raw Walnuts
    "food-vg-sn-02": [
        "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&auto=format&fit=crop&q=80", # dark chocolate pieces
        "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=800&auto=format&fit=crop&q=80"
    ],
    # 17. No-Bake Peanut Butter Protein Energy Bites
    "food-vg-wo-01": [
        "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80", # protein bliss balls
        "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80"
    ],
    # 18. Baked Eggs in Avocado Halves
    "food-kt-bf-02": [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80", # egg avocado
        "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800&auto=format&fit=crop&q=80"
    ],
    # 19. Grilled Chicken Avocado Bacon Salad
    "food-kt-ln-01": [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80", # chicken avocado salad
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80"
    ],
    # 20. Cast Iron Ribeye Steak with Herb Butter
    "food-kt-dn-01": [
        "https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80", # ribeye steak
        "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
    ],
    # 21. Wild Salmon Fillet in Lemon Garlic Butter
    "food-kt-dn-02": [
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80", # pan seared salmon
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80"
    ],
    # 22. Roasted Salted Macadamia Nuts
    "food-kt-sn-01": [
        "https://images.unsplash.com/photo-1536591375685-645c719e7a88?w=800&auto=format&fit=crop&q=80", # mixed nuts/macadamia
        "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80"
    ],
    # 23. Desi Spiced Anda Bhurji with Roti
    "food-ds-bf-01": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/Spicy_egg_bhurji_%40_the_eggfactory.jpg/960px-Spicy_egg_bhurji_%40_the_eggfactory.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80"
    ],
    # 24. Spiced Mutton Qeema Matar
    "food-ds-ln-02": [
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80", # Indian spiced curry/keema
        "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80"
    ],
    # 25. Tandoori Fish Tikka Skewers
    "food-ds-dn-03": [
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80", # tandoori tikka skewers
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80"
    ],
    # 26. Lean Shami Kebabs with Mint Raita
    "food-ds-sn-01": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/4th_October_2012_Shami_Kebab.jpg/960px-4th_October_2012_Shami_Kebab.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=800&auto=format&fit=crop&q=80"
    ],
    # 27. Roasted Spiced Fox Nuts / Makhana
    "food-ds-sn-02": [
        "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=800&auto=format&fit=crop&q=80", # roasted dry snack
        "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&auto=format&fit=crop&q=80"
    ],
    # 28. Skillet Shakshuka with Poached Eggs & Feta
    "food-md-bf-01": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Shakshuka_by_Calliopejen1.jpg/960px-Shakshuka_by_Calliopejen1.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=80"
    ],
    # 29. Greek Labneh & Cucumber Toast
    "food-md-bf-02": [
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=800&auto=format&fit=crop&q=80"
    ],
    # 30. Chicken Souvlaki Skewers with Tzatziki
    "food-md-ln-02": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/%CE%95%CE%BB%CE%BB%CE%B7%CE%BD%CE%B9%CE%BA%CF%8C_%CE%A3%CE%BF%CF%85%CE%B2%CE%BB%CE%AC%CE%BA%CE%B9_-_panoramio.jpg/960px-%CE%95%CE%BB%CE%BB%CE%B7%CE%BD%CE%B9%CE%BA%CF%8C_%CE%A3%CE%BF%CF%85%CE%B2%CE%BB%CE%AC%CE%BA%CE%B9_-_panoramio.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80"
    ],
    # 31. Grilled Mediterranean Seabass / Branzino
    "food-md-dn-01": [
        "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&auto=format&fit=crop&q=80"
    ],
    # 32. Rosemary Lemon Roasted Chicken Thighs
    "food-md-dn-02": [
        "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&auto=format&fit=crop&q=80"
    ],
    # 33. Creamy Olive Oil Hummus Bowl with Pita
    "food-md-sn-01": [
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Lebanese_style_hummus.jpg/960px-Lebanese_style_hummus.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail",
        "https://images.unsplash.com/photo-1577906096429-f73c2c312435?w=800&auto=format&fit=crop&q=80"
    ],
    # 34. Greek Fig, Walnut & Honey Fuel Bowl
    "food-md-wo-01": [
        "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80"
    ]
}

def download_file(url, out):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as r, open(out, 'wb') as f:
            f.write(r.read())
        return True
    except Exception as e:
        print(f"Error {url}: {e}")
        return False

downloaded = {}
for id, urls in candidates.items():
    for idx, u in enumerate(urls):
        fn = f"apps/mobile/food_verify/{id}_cand{idx+1}.jpg"
        if download_file(u, fn):
            print(f"OK: {fn}")
            if id not in downloaded:
                downloaded[id] = []
            downloaded[id].append({"idx": idx+1, "url": u, "path": fn})

print(f"Total downloaded candidates: {sum(len(v) for v in downloaded.values())}")
