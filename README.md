# The Marlene File: Backend

Backend for our NASA Space Apps Challenge 2026 project, for the challenge "Be An Earth System Trend Detective". It stores precomputed yearly time series and trend results for a set of regions, and serves them as JSON to the frontend. It also recalculates the trend for any year range the student picks.

**Status:** the data in this repository is real NASA data (see the Data section). It covers 1990-2020, three regions and three variables.

## Stack

Python, Django, Django REST Framework, django-cors-headers, SQLite, pymannkendall, scipy, numpy.

## Setup (Windows, PowerShell)

Run these one at a time:

```
git clone https://github.com/malakabogazia/marlene-file.git
cd marlene-file
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py load_sites data/nasa_sites.json
python manage.py runserver
```

On Mac or Linux, activate with `source venv/bin/activate` instead.

When the server is running, open http://127.0.0.1:8000/api/sites/ in a browser. You should see a list of 9 sites.

Each time you reopen the project, activate the virtual environment again (`venv\Scripts\activate`) before running the server. The prompt should start with `(venv)`.

## Data

The data comes from two NASA GES DISC datasets, 1990-2020, reduced to one value per year for each region:

| Variable | Dataset | Resolution | DOI |
|---|---|---|---|
| Precipitation | GPCP Monthly V3.3 | 0.5 degrees | 10.5067/MEASURES/GPCP/DATA306 |
| Actual evapotranspiration | FLDAS Noah Global Monthly V001 (`Evap_tavg`) | 0.1 degrees | 10.5067/5NHC22T9375G |
| Soil moisture (0-10 cm) | FLDAS Noah Global Monthly V001 (`SoilMoi00_10cm_tavg`) | 0.1 degrees | 10.5067/5NHC22T9375G |

Regions (boxes):

| Region | Longitude | Latitude |
|---|---|---|
| Mediterranean | -10 to 42 E | 29 to 46 N |
| Nile Delta | 29.5 to 32.5 E | 30 to 31.7 N |
| Sahel | -17 to 20 E | 12 to 18 N |

Three regions times three variables gives 9 sites, all in `data/nasa_sites.json`.

How the yearly values were made: monthly values were averaged over each region with cos(latitude) area weighting. Precipitation and evapotranspiration are the sum of the 12 months of the year. Soil moisture is the mean of the 12 months.

## API

| Address | What it returns |
|---|---|
| `GET /api/sites/` | List of all sites (id, name, variable, region). Used for the map pins. |
| `GET /api/sites/<id>/` | One site in full: units, source, start and end year, all points, and the stored result. |
| `GET /api/sites/<id>/trend/?start=YYYY&end=YYYY` | Recalculates the trend for a year range. |

Example of the trend answer (the numbers here are only an illustration of the format, not a real result):

```json
{
  "site": "Sahel",
  "start": 1995,
  "end": 2020,
  "n_points": 26,
  "slope_per_decade": 10.0,
  "p_value": 0.03,
  "test_used": "Mann-Kendall",
  "is_significant": true
}
```

The trend address answers with an error message and status 400 if there are fewer than 5 points in the range, the years are invalid or reversed, or the site has no data. A site id that doesn't exist gives 404.

## Data format

Each site in a data file looks like this (the series is shortened, and the numbers are only an illustration of the format):

```json
{
  "name": "Sahel",
  "variable": "Precipitation",
  "region": "Sahel",
  "units": "mm/year",
  "source_name": "Name of the dataset",
  "source_link": "https://...",
  "start_year": 1990,
  "end_year": 2020,
  "points": [
    {"year": 1990, "value": 400.0},
    {"year": 1991, "value": 410.0}
  ],
  "result": {
    "slope_per_decade": 10.0,
    "p_value": 0.03,
    "test_used": "Mann-Kendall",
    "is_significant": true
  }
}
```

A data file is a JSON list of these. **Rules the loader enforces:**

- One value per year. A year can't appear twice for the same site.
- Missing years are left out completely. Never write `-9999`, `NaN`, or zero in their place.
- `is_significant` must match `p_value < 0.05`.
- A site is identified by its `name` plus its `variable`.
- `slope_per_decade` is the change per 10 years, in the variable's own units. It assumes yearly data.
- `variable` must be one of the three names the backend knows: `Precipitation`, `Actual evapotranspiration`, `Soil moisture (0-10 cm)`.
- If anything in a file is wrong, the loader saves nothing and says what's wrong.

## Loading data

```
python manage.py load_sites data/nasa_sites.json
```

Running it again updates the sites instead of duplicating them.

## Tests

```
python manage.py test cases
```

There are 17 tests. They cover the trend view (including missing years and bad input), the loader, and the database rules. Run them before every commit.

## Project layout

```
config/            Django settings and the main URL switchboard
cases/             The app: models, serializers, views, URLs, tests
  management/commands/load_sites.py   Loads a JSON data file
data/              nasa_sites.json (the real data) and a small sample file
manage.py          Django's command tool
requirements.txt   Python packages
```

## Known limits

- FLDAS evapotranspiration and soil moisture are model output, not direct measurements. The model is driven by MERRA-2 and CHIRPS.
- The Sahel results are not independent of each other: the same weather drives precipitation, evapotranspiration and soil moisture there.
- Nile Delta evapotranspiration and soil moisture are not reliable, because FLDAS does not model irrigation, and the Delta is heavily irrigated.
- We run 9 tests at the 5% level, so one false positive is possible by chance alone.
- Trends use yearly values for 1990-2020 only. A different start or end year can change the answer.
- "Not enough evidence yet" does not mean "no trend".
- The minimum for a trend calculation is 5 points. That is our own choice.
- `CORS_ALLOW_ALL_ORIGINS` is on for development and must be restricted before deployment.
- The Django secret key and `DEBUG` setting are for development only and must be changed before deployment.
