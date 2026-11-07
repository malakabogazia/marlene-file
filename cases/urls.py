from django.urls import path
from .views import SiteList, SiteDetail, SiteTrend

urlpatterns = [
    path('sites/', SiteList.as_view()),
    path('sites/<int:pk>/', SiteDetail.as_view()),
    path('sites/<int:pk>/trend/', SiteTrend.as_view()),
]