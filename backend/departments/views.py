from rest_framework import viewsets, permissions, filters
from accounts.permissions import IsHRAdmin, IsHRAdminOrManager
from .models import Department, JobRole
from .serializers import DepartmentSerializer, JobRoleSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.prefetch_related('job_roles', 'employees').all()
    serializer_class = DepartmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['department_name', 'code', 'description']
    ordering_fields = ['department_name', 'code', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated and user.role == 'MANAGER':
            if user.department_id:
                return queryset.filter(pk=user.department_id)
            return queryset.none()
        if user and user.is_authenticated and user.role == 'EMPLOYEE':
            return queryset.filter(pk=user.department_id) if user.department_id else queryset.none()
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHRAdmin()]
        return [permissions.IsAuthenticated()]


class JobRoleViewSet(viewsets.ModelViewSet):
    queryset = JobRole.objects.select_related('department').all()
    serializer_class = JobRoleSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['role_name', 'department__department_name']
    ordering_fields = ['role_name', 'created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user and user.is_authenticated and user.role == 'MANAGER':
            if user.department_id:
                queryset = queryset.filter(department_id=user.department_id)
            else:
                queryset = queryset.none()
        elif user and user.is_authenticated and user.role == 'EMPLOYEE':
            queryset = queryset.filter(department_id=user.department_id) if user.department_id else queryset.none()

        dept_id = self.request.query_params.get('department')
        if dept_id:
            if user and user.is_authenticated and user.role in ('MANAGER', 'EMPLOYEE'):
                queryset = queryset.filter(department_id=user.department_id) if user.department_id else queryset.none()
            else:
                queryset = queryset.filter(department_id=dept_id)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHRAdmin()]
        return [permissions.IsAuthenticated()]
