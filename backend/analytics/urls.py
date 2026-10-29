from django.urls import path
from .views import (
    AnalyticsOverviewView,
    AttritionAnalyticsView,
    PerformanceAnalyticsView,
    SalaryAnalyticsView,
    SatisfactionAnalyticsView
)

urlpatterns = [
    path('overview/', AnalyticsOverviewView.as_view(), name='analytics_overview'),
    path('attrition/', AttritionAnalyticsView.as_view(), name='analytics_attrition'),
    path('performance/', PerformanceAnalyticsView.as_view(), name='analytics_performance'),
    path('salary/', SalaryAnalyticsView.as_view(), name='analytics_salary'),
    path('satisfaction/', SatisfactionAnalyticsView.as_view(), name='analytics_satisfaction'),
]
