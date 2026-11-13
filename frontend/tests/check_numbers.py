"""Check that the API serves the nine correct results (section 9 of the frontend brief).

Usage:  python frontend/tests/check_numbers.py [API base address]
Default address: http://127.0.0.1:8000   (for the live site: https://marlene-file.onrender.com)

It compares, for all nine cases:
  1. the API with data/nasa_sites.json (p-value, slope, verdict, number of points), and
  2. the API with the reference table from the brief (average, change per decade, percent, p-value, verdict).
It also checks the start-year lesson: testing from 1995 must give the expected p-values.
Uses only the Python standard library.
"""
import json, sys, urllib.request, pathlib

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000').rstrip('/')
ROOT = pathlib.Path(__file__).resolve().parents[2]

# (region, variable): average, change per decade, percent of average, p-value, significant.  Soil moisture in percent.
TABLE = {
    ('Mediterranean', 'Precipitation'): (490.3, 11.43, 2.3, 0.2478, False),
    ('Mediterranean', 'Actual evapotranspiration'): (370.5, 11.87, 3.2, 0.0076, True),
    ('Mediterranean', 'Soil moisture (0-10 cm)'): (24.8, 0.12, 0.5, 0.2475, False),
    ('Nile Delta', 'Precipitation'): (77.1, 3.79, 4.9, 0.5074, False),
    ('Nile Delta', 'Actual evapotranspiration'): (58.1, 0.67, 1.2, 0.8384, False),
    ('Nile Delta', 'Soil moisture (0-10 cm)'): (17.6, -0.08, -0.5, 0.2837, False),
    ('Sahel', 'Precipitation'): (427.9, 27.55, 6.4, 0.0053, True),
    ('Sahel', 'Actual evapotranspiration'): (346.4, 13.84, 4.0, 0.0041, True),
    ('Sahel', 'Soil moisture (0-10 cm)'): (19.7, 0.33, 1.7, 0.0004, True),
}
FROM_1995 = {('Mediterranean', 'Actual evapotranspiration'): (0.366, False), ('Sahel', 'Actual evapotranspiration'): (0.0896, False),
             ('Sahel', 'Precipitation'): (0.0082, True), ('Sahel', 'Soil moisture (0-10 cm)'): (0.0017, True)}

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=120) as r:
        return json.load(r)

def region_of(name):
    return next(r for r in ('Mediterranean', 'Nile Delta', 'Sahel') if name.startswith(r))

problems, checked = [], 0
data = {(region_of(s['name']), s['variable']): s for s in json.load(open(ROOT / 'data' / 'nasa_sites.json'))}
sites = get('/api/sites/')
if len(sites) != 9:
    problems.append(f'expected 9 sites, the API lists {len(sites)}')
for item in sites:
    s = get(f"/api/sites/{item['id']}/")
    key = (region_of(s['name']), s['variable']); r = s['result']; d = data[key]; checked += 1
    def bad(what, got, want): problems.append(f'{key}: {what} is {got}, expected {want}')
    # 1. against the data file
    if abs(r['p_value'] - d['result']['p_value']) > 1e-9: bad('p-value (vs data file)', r['p_value'], d['result']['p_value'])
    if abs(r['slope_per_decade'] - d['result']['slope_per_decade']) > 1e-9: bad('slope (vs data file)', r['slope_per_decade'], d['result']['slope_per_decade'])
    if r['is_significant'] != d['result']['is_significant']: bad('verdict (vs data file)', r['is_significant'], d['result']['is_significant'])
    if len(s['points']) != len(d['points']) or len(s['points']) != 31: bad('number of points', len(s['points']), 31)
    # 2. against the brief's table, computed the same way the frontend computes it
    avg_t, slope_t, pct_t, p_t, sig_t = TABLE[key]
    scale = 100 if key[1].startswith('Soil') else 1
    avg = sum(q['value'] for q in s['points']) / len(s['points'])
    if round(avg * scale, 1) != avg_t: bad('average', round(avg * scale, 1), avg_t)
    # allow half a unit in the last place: the table was rounded from more decimals than the API stores
    if abs(r['slope_per_decade'] * scale - slope_t) > 0.0051: bad('change per decade', round(r['slope_per_decade'] * scale, 3), slope_t)
    if round(r['slope_per_decade'] / avg * 100, 1) != pct_t: bad('percent of average', round(r['slope_per_decade'] / avg * 100, 1), pct_t)
    if round(r['p_value'], 4) != p_t: bad('p-value', round(r['p_value'], 4), p_t)
    if r['is_significant'] != sig_t or r['is_significant'] != (r['p_value'] < 0.05): bad('verdict', r['is_significant'], sig_t)
    # 3. the start-year lesson
    if key in FROM_1995:
        t = get(f"/api/sites/{item['id']}/trend/?start=1995&end={s['end_year']}")
        p_want, sig_want = FROM_1995[key]
        if abs(t['p_value'] - p_want) > 0.0006 or t['is_significant'] != sig_want: bad('from 1995', (round(t['p_value'], 4), t['is_significant']), FROM_1995[key])

sig = sum(1 for k, v in TABLE.items() if v[4])
print(f'Checked {checked} cases at {BASE}. Expected significant: {sig} of 9.')
if problems:
    print('PROBLEMS:'); [print(' -', p) for p in problems]; sys.exit(1)
print('All nine cases match the data file and the reference table, and the 1995 start-year checks pass.')
