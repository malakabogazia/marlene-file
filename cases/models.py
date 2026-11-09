from django.db import models


class Site(models.Model):
    VARIABLE_CHOICES = [
        ('ice', 'Sea ice extent'),
        ('sea', 'Sea level change'),
        ('rain', 'Precipitation'),
    ]
    name = models.CharField(max_length=100)
    variable = models.CharField(max_length=10, choices=VARIABLE_CHOICES)
    region = models.CharField(max_length=100)
    units = models.CharField(max_length=50)
    source_name = models.CharField(max_length=200)
    source_link = models.URLField(blank=True)
    start_year = models.IntegerField()
    end_year = models.IntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['name', 'variable'], name='unique_site_per_variable'),
        ]

    def __str__(self):
        return self.name


class TimeSeriesPoint(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='points')
    year = models.IntegerField()
    value = models.FloatField()

    class Meta:
        ordering = ['year']
        constraints = [
            models.UniqueConstraint(fields=['site', 'year'], name='one_value_per_year'),
        ]


class Result(models.Model):
    site = models.OneToOneField(Site, on_delete=models.CASCADE, related_name='result')
    slope_per_decade = models.FloatField()
    p_value = models.FloatField()
    test_used = models.CharField(max_length=50, default='Mann-Kendall')
    is_significant = models.BooleanField()