from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeViewSet, PerformanceRecordViewSet, SatisfactionRecordViewSet

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'performance-records', PerformanceRecordViewSet, basename='performance_record')
router.register(r'satisfaction-records', SatisfactionRecordViewSet, basename='satisfaction_record')

urlpatterns = [
    path('', include(router.urls)),
]
