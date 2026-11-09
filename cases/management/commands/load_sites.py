import json
import math
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from cases.models import Site, TimeSeriesPoint, Result

MISSING_MARKER = -9999


def check_site(s):
    """Stop with a clear message if this site's data is not usable."""
    label = f"site '{s.get('name')}' ({s.get('variable')})"
    for p in s['points']:
        v = p['value']
        if not isinstance(v, (int, float)) or isinstance(v, bool) or math.isnan(v):
            raise CommandError(f"{label}: year {p['year']} has value {v!r}, which is not a number.")
        if v == MISSING_MARKER:
            raise CommandError(
                f"{label}: year {p['year']} has {MISSING_MARKER} (the 'missing data' marker). "
                "Remove that year from the file instead.")
    r = s['result']
    if r['is_significant'] != (r['p_value'] < 0.05):
        raise CommandError(
            f"{label}: is_significant is {r['is_significant']} but p_value is {r['p_value']}. "
            "It must be true only when p_value < 0.05.")


class Command(BaseCommand):
    help = 'Load sites from a JSON file'

    def add_arguments(self, parser):
        parser.add_argument('path')

    @transaction.atomic  # all-or-nothing: a bad file leaves the database unchanged
    def handle(self, *args, **options):
        with open(options['path'], encoding='utf-8') as f:
            sites = json.load(f)

        for s in sites:  # check the whole file first, save nothing if any site is bad
            check_site(s)

        for s in sites:
            site, _ = Site.objects.update_or_create(
                name=s['name'],
                variable=s['variable'],
                defaults={
                    'region': s['region'],
                    'units': s['units'],
                    'source_name': s['source_name'],
                    'source_link': s.get('source_link', ''),
                    'start_year': s['start_year'],
                    'end_year': s['end_year'],
                },
            )
            site.points.all().delete()
            TimeSeriesPoint.objects.bulk_create(
                [TimeSeriesPoint(site=site, year=p['year'], value=p['value'])
                 for p in s['points']]
            )
            r = s['result']
            Result.objects.update_or_create(
                site=site,
                defaults={
                    'slope_per_decade': r['slope_per_decade'],
                    'p_value': r['p_value'],
                    'test_used': r.get('test_used', 'Mann-Kendall'),
                    'is_significant': r['is_significant'],
                },
            )

        self.stdout.write(self.style.SUCCESS(f'Loaded {len(sites)} sites'))