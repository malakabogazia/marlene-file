# The Marlene File: project context for Claude Code

## Who I am and how I want you to work
I'm Malak, a CS student (Egypt), team lead and backend developer. I want to LEARN, so:
- Explain the why of each step and keep answers short.
- Give one step at a time. Don't rewrite or generate whole files unless I ask. Show me what to change and where.
- Don't change models, migrations, or the data format without asking me first.
- Never put passwords, API keys, or tokens in any file.

## The competition and the challenge
NASA Space Apps Challenge 2026, hackathon Nov 13-14, 2026. Our challenge is "Be An Earth System Trend Detective". NASA's checklist: pick a variable, pick a region, pick a time period, build a time series, then test significance. Accepted tests: t-test, Mann-Kendall, confidence intervals. p < 0.05 means significant. p > 0.05 means "not enough evidence yet", NOT "no trend". NASA says simple linear trends are enough and complex analysis is out of scope. NASA posts its official resources on the Space Apps site on Nov 13, so the plan must stay flexible.

## Our idea
A student plays an intern detective trained by Marlene, an original senior detective character with a 1930s-England style. The student makes a hunch, picks a place, collects three proofs (raw readings, the trend, the verdict), and the site honestly says whether the evidence is strong enough. Later they can open their own case. The value is teaching how scientists judge evidence, not displaying data. The design is finished in Figma (a separate frontend teammate builds it).

## Our scope (hard limits)
- 3 variables, 3 regions each. Variables are NOT final: current plan is sea ice extent, sea level, and precipitation, with a possible switch to precipitation, soil moisture, and evapotranspiration. Final decision is planned for Tue Nov 10.
- Regions are chosen AFTER looking at real data. Never adjust numbers to fit a story.
- Student laptop only: no cloud, no GPUs, no machine learning, no big downloads, no paid services.
- No live calls to NASA from the website. Data is computed once offline and stored.
- Keep statistics basic: linear trend, Mann-Kendall, Sen's slope, p-value.

## What's built (backend, Django, already on GitHub)
Stack: Django, Django REST Framework, django-cors-headers, SQLite, pymannkendall, numpy. Project folder `config`, app `cases`. Read the code instead of trusting this summary:
- `cases/models.py`: Site, TimeSeriesPoint (year, value), Result (slope_per_decade, p_value, test_used, is_significant).
- `cases/serializers.py`, `cases/views.py`, `cases/urls.py`: API endpoints:
  - `GET /api/sites/` lists sites
  - `GET /api/sites/<id>/` returns one site with its points and result
  - `GET /api/sites/<id>/trend/?start=YYYY&end=YYYY` recalculates Mann-Kendall for a year range (needs at least 5 points)
- `cases/management/commands/load_sites.py`: loads a JSON file into the database (`python manage.py load_sites data/sample_sites.json`).
- `data/sample_sites.json`: ONE fake test site. It is also the format the data analyst must deliver.
- Tested by hand on the fake data: slope about -1.2 per decade, p about 0.0085 for the sample.

## Known issues to keep in mind
- The trend view multiplies the slope by 10 to get "per decade". That is only right for YEARLY data.
- The 5-point minimum is my own choice.
- `CORS_ALLOW_ALL_ORIGINS = True` is only for development and must be restricted before deployment.
- The default Django SECRET_KEY is in settings.py and was pushed to a private repo. It's the throwaway dev key, but move it to an environment variable before deploying.
- Nothing has been tested on real data yet.

## Task 1: a quick health check (do this first, report before changing anything)
1. Review the code for mistakes or bad practices and tell me what you find. Don't fix anything silently.
2. Check `python manage.py check` and migrations are in order.
3. Confirm the three endpoints work and the trend view handles bad input (missing years, out-of-range years, a site with no points).
4. Tell me if requirements.txt and .gitignore look right.

## Task 2: help me find the data
Goal: for each variable, find ONE global gridded dataset, then cut small regional series from it. Candidates (from my data analyst, still unverified; please check each exists and is current):
- Sea ice extent: NSIDC Sea Ice Index (G02135), monthly, from 1979. Missing values marked -9999. This is the safe fallback.
- Precipitation: GPCP monthly (from 1979) or GPM IMERG monthly (from about 1998-2000).
- Soil moisture: NASA FLDAS (from 1982, monthly).
- Evapotranspiration: MODIS MOD16A2GF (from 2000).
- Sea level: NASA satellite altimetry (from 1993).
For each dataset, report: the official link, file size, time resolution, years covered, whether it needs a login, how to extract a small regional series without downloading everything, and any problem to watch (missing values, units, seasonal cycle). Download nothing large without asking me first. If a link or fact is uncertain, say so instead of guessing. Do not invent data.

## Output format the data must end up in
One JSON file with one entry per site, exactly like `data/sample_sites.json`: name, variable, region, units, source_name, source_link, start_year, end_year, points (year and value, ONE value per year), and result (slope_per_decade, p_value, test_used, is_significant where significant means p < 0.05). Monthly data must be reduced to yearly values first, and I need to be told how.