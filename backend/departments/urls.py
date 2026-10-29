from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentViewSet, JobRoleViewSet

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'job-roles', JobRoleViewSet, basename='job_role')

urlpatterns = [
    path('', include(router.urls)),
]
