from rest_framework import serializers
from .models import Site, TimeSeriesPoint, Result


class PointSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSeriesPoint
        fields = ['year', 'value']


class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = ['slope_per_decade', 'p_value', 'test_used', 'is_significant']


class SiteListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ['id', 'name', 'variable', 'region']


class SiteDetailSerializer(serializers.ModelSerializer):
    points = PointSerializer(many=True, read_only=True)
    result = ResultSerializer(read_only=True)

    class Meta:
        model = Site
        fields = ['id', 'name', 'variable', 'region', 'units', 'source_name',
                  'source_link', 'start_year', 'end_year', 'points', 'result']