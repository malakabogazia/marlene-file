# The Marlene File: Backend

Backend for our NASA Space Apps Challenge 2026 project, for the challenge "Be An Earth System Trend Detective". It stores precomputed time series and trend results for a set of places, and serves them as JSON to the frontend. It also recalculates the trend for any year range the student picks.

**Status:** the data in this repository is **fake sample data** for building and testing. Real NASA-based data will replace it. The variables are not final yet.

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
python manage.py load_sites data/fake_sites.json
python manage.py runserver
```

On Mac or Linux, activate with `source venv/bin/activate` instead.

When the server is running, open http://127.0.0.1:8000/api/sites/ in a browser. You should see a list of 9 sites.

Each time you reopen the project, activate the virtual environment again (`venv\Scripts\activate`) before running the server. The prompt should start with `(venv)`.

## API

| Address | What it returns |
|---|---|
| `GET /api/sites/` | List of all sites (id, name, variable, region). Used for the globe pins. |
| `GET /api/sites/<id>/` | One site in full: units, source, start and end year, all points, and the stored result. |
| `GET /api/sites/<id>/trend/?start=YYYY&end=YYYY` | Recalculates the trend for a year range. |

Example of the trend answer:

```json
{
  "site": "Arctic Ocean",
  "start": 2005,
  "end": 2020,
  "n_points": 16,
  "slope_per_decade": -0.8,
  "p_value": 0.003,
  "test_used": "Mann-Kendall",
  "is_significant": true
}
```

The trend address answers with an error message and status 400 if there are fewer than 5 points in the range, the years are invalid or reversed, or the site has no data. A site id that doesn't exist gives 404.

## Data format

Each site in a data file looks like this (the series is shortened here):

```json
{
  "name": "Arctic Ocean",
  "variable": "ice",
  "region": "Arctic Ocean",
  "units": "million km2",
  "source_name": "Name of the dataset",
  "source_link": "https://...",
  "start_year": 2000,
  "end_year": 2020,
  "points": [
    {"year": 2000, "value": 7.2},
    {"year": 2001, "value": 7.1}
  ],
  "result": {
    "slope_per_decade": -0.8,
    "p_value": 0.003,
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
- `variable` must be one of the codes the backend knows. Today these are `ice`, `sea` and `rain`. **This list will change after the variables are decided.**
- If anything in a file is wrong, the loader saves nothing and says what's wrong.

## Loading data

```
python manage.py load_sites data/fake_sites.json
```

Running it again updates the sites instead of duplicating them. The fake file can be regenerated with `python data/make_fake_data.py`.

**Before the final demo, the fake sites must be deleted** (in the admin panel at `/admin`, which needs `python manage.py createsuperuser`) so they never mix with real data.

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
data/              Sample data and the script that makes it
manage.py          Django's command tool
requirements.txt   Python packages
```

## Known limits

- All data here is fake until the real data is loaded.
- Nothing has been checked against published NASA, NSIDC or NOAA values yet.
- `CORS_ALLOW_ALL_ORIGINS` is on for development and must be restricted before deployment.
- The Django secret key and `DEBUG` setting are for development only and must be changed before deployment.
- The minimum for a trend calculation is 5 points. That is our own choice.