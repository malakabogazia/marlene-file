import json
from django.core.management.base import BaseCommand
from cases.models import Site, TimeSeriesPoint, Result


class Command(BaseCommand):
    help = 'Load sites from a JSON file'

    def add_arguments(self, parser):
        parser.add_argument('path')

    def handle(self, *args, **options):
        with open(options['path'], encoding='utf-8') as f:
            sites = json.load(f)

        for s in sites:
            site, _ = Site.objects.update_or_create(
                name=s['name'],
                defaults={
                    'variable': s['variable'],
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