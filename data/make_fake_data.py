import json
import random

import pymannkendall as mk
from scipy.stats import theilslopes

random.seed(1)  # same fake numbers every time you run it

YEARS = list(range(2000, 2021))

# name, variable code, units, starting value, change per year, noise size
SITES = [
    ("Arctic Ocean",    "ice",  "million km2",   7.0, -0.08, 0.25),
    ("Barents Sea",     "ice",  "million km2",   1.5, -0.04, 0.08),
    ("Antarctic",       "ice",  "million km2",  18.0,  0.00, 0.50),
    ("Western Pacific", "sea",  "mm",            0.0,  3.50, 4.0),
    ("US West Coast",   "sea",  "mm",            0.0,  0.30, 6.0),
    ("Third Coastline", "sea",  "mm",            0.0, -0.60, 3.0),
    ("Wetter Land",     "rain", "mm per month", 80.0,  0.80, 8.0),
    ("Steady Land",     "rain", "mm per month", 60.0,  0.00, 8.0),
    ("The Sahel",       "rain", "mm per month", 50.0, -0.70, 6.0),
]

sites = []
for name, variable, units, start, step, noise in SITES:
    values = [
        round(start + step * i + random.gauss(0, noise), 3)
        for i in range(len(YEARS))
    ]
    test = mk.original_test(values)
    p_value = round(float(test.p), 6)
    slope = float(theilslopes(values, YEARS)[0]) * 10  # per decade

    sites.append({
        "name": name,
        "variable": variable,
        "region": name,
        "units": units,
        "source_name": "FAKE SAMPLE DATA",
        "source_link": "",
        "start_year": YEARS[0],
        "end_year": YEARS[-1],
        "points": [{"year": y, "value": v} for y, v in zip(YEARS, values)],
        "result": {
            "slope_per_decade": round(slope, 4),
            "p_value": p_value,
            "test_used": "Mann-Kendall",
            "is_significant": p_value < 0.05,
        },
    })

with open("data/fake_sites.json", "w", encoding="utf-8") as f:
    json.dump(sites, f, indent=2)

print(f"Wrote {len(sites)} fake sites")