import pymannkendall as mk
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Site
from .serializers import SiteListSerializer, SiteDetailSerializer


class SiteList(ListAPIView):
    queryset = Site.objects.all()
    serializer_class = SiteListSerializer


class SiteDetail(RetrieveAPIView):
    queryset = Site.objects.all()
    serializer_class = SiteDetailSerializer


class SiteTrend(APIView):
    def get(self, request, pk):
        site = get_object_or_404(Site, pk=pk)

        try:
            start = int(request.query_params.get('start', site.start_year))
            end = int(request.query_params.get('end', site.end_year))
        except ValueError:
            return Response({'error': 'start and end must be whole years'}, status=400)

        points = site.points.filter(year__gte=start, year__lte=end)
        values = [p.value for p in points]

        if len(values) < 5:
            return Response(
                {'error': 'Need at least 5 years of data in that range'},
                status=400,
            )

        result = mk.original_test(values)

        return Response({
            'site': site.name,
            'start': start,
            'end': end,
            'n_points': len(values),
            'slope_per_decade': float(result.slope) * 10,
            'p_value': float(result.p),
            'test_used': 'Mann-Kendall',
            'is_significant': bool(result.p < 0.05),
        })