from rest_framework import views, permissions
from rest_framework.response import Response
from .services import AnalyticsService

class AnalyticsOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsService.get_overview_analytics(request.user, request.query_params)
        return Response(data)


class AttritionAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsService.get_attrition_analytics(request.user, request.query_params)
        return Response(data)


class PerformanceAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsService.get_performance_analytics(request.user, request.query_params)
        return Response(data)


class SalaryAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsService.get_salary_analytics(request.user, request.query_params)
        return Response(data)


class SatisfactionAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = AnalyticsService.get_satisfaction_analytics(request.user, request.query_params)
        return Response(data)
