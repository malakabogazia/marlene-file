import json
import os
import tempfile
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import IntegrityError
from django.test import TestCase

from .models import Site, TimeSeriesPoint, Result


def make_site(name='Test', variable='ice', years=range(2000, 2010), slope=-0.1):
    """A site whose values fall by `slope` every year (a perfect straight line)."""
    years = list(years)
    first, last = (years[0], years[-1]) if years else (2000, 2010)
    site = Site.objects.create(name=name, variable=variable, region='R', units='u',
                               source_name='test', start_year=first, end_year=last)
    for y in years:
        TimeSeriesPoint.objects.create(site=site, year=y, value=10 + slope * (y - first))
    return site


class TrendViewTests(TestCase):
    def url(self, site, query=''):
        return f'/api/sites/{site.id}/trend/{query}'

    def test_full_range(self):
        site = make_site()
        data = self.client.get(self.url(site)).json()
        self.assertEqual(data['n_points'], 10)
        self.assertAlmostEqual(data['slope_per_decade'], -1.0)
        self.assertTrue(data['is_significant'])
        self.assertEqual(data['is_significant'], data['p_value'] < 0.05)

    def test_year_range(self):
        site = make_site()
        data = self.client.get(self.url(site, '?start=2002&end=2008')).json()
        self.assertEqual((data['start'], data['end'], data['n_points']), (2002, 2008, 7))

    def test_gap_years_use_real_spacing(self):
        # Readings every 5 years; the true trend is still -1.0 per decade, not -5.0.
        site = make_site(years=[2000, 2005, 2010, 2015, 2020])
        data = self.client.get(self.url(site)).json()
        self.assertAlmostEqual(data['slope_per_decade'], -1.0)

    def test_too_few_points(self):
        site = make_site()
        self.assertEqual(self.client.get(self.url(site, '?start=2007')).status_code, 400)

    def test_out_of_range_and_reversed(self):
        site = make_site()
        for q in ['?start=1900&end=1950', '?start=2009&end=2000']:
            self.assertEqual(self.client.get(self.url(site, q)).status_code, 400, q)

    def test_site_with_no_points(self):
        site = make_site(years=[])
        self.assertEqual(self.client.get(self.url(site)).status_code, 400)

    def test_bad_input(self):
        site = make_site()
        for q in ['?start=abc', '?start=', '?end=2015.5']:
            self.assertEqual(self.client.get(self.url(site, q)).status_code, 400, q)

    def test_unknown_site(self):
        self.assertEqual(self.client.get('/api/sites/999/trend/').status_code, 404)


def sample_site(**changes):
    site = {
        'name': 'Test Arctic', 'variable': 'ice', 'region': 'Arctic Ocean',
        'units': 'million km2', 'source_name': 'FAKE', 'source_link': '',
        'start_year': 2015, 'end_year': 2020,
        'points': [{'year': y, 'value': v} for y, v in
                   zip(range(2015, 2021), [4.6, 4.5, 4.4, 4.3, 4.1, 4.0])],
        'result': {'slope_per_decade': -1.2, 'p_value': 0.0085,
                   'test_used': 'Mann-Kendall', 'is_significant': True},
    }
    site.update(changes)
    return site


class LoaderTests(TestCase):
    def load(self, sites):
        tmp = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8')
        with tmp:
            json.dump(sites, tmp)
        self.addCleanup(os.remove, tmp.name)
        call_command('load_sites', tmp.name, stdout=StringIO())

    def test_sample_file_loads(self):
        call_command('load_sites', 'data/sample_sites.json', stdout=StringIO())
        site = Site.objects.get(name='Test Arctic', variable='ice')
        self.assertEqual(site.points.count(), 6)
        self.assertTrue(site.result.is_significant)

    def test_reload_replaces_instead_of_duplicating(self):
        self.load([sample_site()])
        self.load([sample_site(region='Changed')])
        self.assertEqual(Site.objects.count(), 1)
        self.assertEqual(TimeSeriesPoint.objects.count(), 6)
        self.assertEqual(Site.objects.get().region, 'Changed')

    def test_same_name_different_variable_are_two_sites(self):
        self.load([sample_site(), sample_site(variable='rain')])
        self.assertEqual(Site.objects.filter(name='Test Arctic').count(), 2)

    def test_rejects_missing_marker(self):
        bad = sample_site()
        bad['points'][2]['value'] = -9999
        with self.assertRaisesMessage(CommandError, '-9999'):
            self.load([bad])

    def test_rejects_nan(self):
        bad = sample_site()
        bad['points'][2]['value'] = float('nan')
        with self.assertRaisesMessage(CommandError, 'not a number'):
            self.load([bad])

    def test_rejects_wrong_is_significant(self):
        bad = sample_site()
        bad['result']['p_value'] = 0.2  # not significant, but file says True
        with self.assertRaisesMessage(CommandError, 'is_significant'):
            self.load([bad])

    def test_bad_file_saves_nothing(self):
        bad = sample_site(name='Bad')
        bad['points'][0]['value'] = -9999
        with self.assertRaises(CommandError):
            self.load([sample_site(), bad])  # first site is fine, second is bad
        self.assertEqual(Site.objects.count(), 0)


class ConstraintTests(TestCase):
    def test_one_value_per_year(self):
        site = make_site(years=[2000])
        with self.assertRaises(IntegrityError):
            TimeSeriesPoint.objects.create(site=site, year=2000, value=1)

    def test_unique_name_and_variable(self):
        make_site(years=[])
        with self.assertRaises(IntegrityError):
            make_site(years=[])
