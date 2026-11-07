from django.contrib import admin
from .models import Site, TimeSeriesPoint, Result

admin.site.register(Site)
admin.site.register(TimeSeriesPoint)
admin.site.register(Result)