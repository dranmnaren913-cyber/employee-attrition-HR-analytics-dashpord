from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from accounts.permissions import IsHRAdmin, IsHRAdminOrManager
from .models import Employee, PerformanceRecord, SatisfactionRecord, ImportLog
from .serializers import (
    EmployeeSerializer,
    EmployeeDetailSerializer,
    PerformanceRecordSerializer,
    SatisfactionRecordSerializer,
    ImportLogSerializer
)
from .services import process_employee_import, export_employees

User = get_user_model()

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


def filter_employee_queryset(queryset, query_params, user=None):
    """Reusable filtering logic across Employee views and Analytics/Exports."""
    manager_department_id = None
    if user and getattr(user, 'is_authenticated', False) and user.role == 'MANAGER':
        manager_department_id = user.department_id

    if manager_department_id:
        queryset = queryset.filter(department_id=manager_department_id)

    dept = query_params.get('department')
    if dept:
        allowed_department_ids = {str(manager_department_id)} if manager_department_id else None
        if allowed_department_ids is not None:
            requested = [value.strip() for value in dept.split(',') if value.strip()]
            dept_ids = [value for value in requested if value == str(manager_department_id)]
            queryset = queryset.filter(department_id__in=dept_ids) if dept_ids else queryset.none()
        elif ',' in dept:
            queryset = queryset.filter(department_id__in=[value.strip() for value in dept.split(',') if value.strip()])
        else:
            queryset = queryset.filter(department_id=dept)

    role = query_params.get('job_role')
    if role:
        if manager_department_id:
            requested = [value.strip() for value in role.split(',') if value.strip()]
            valid_role_ids = list(
                queryset.filter(job_role__department_id=manager_department_id).
                values_list('job_role_id', flat=True).distinct()
            )
            allowed_ids = [value for value in requested if value.isdigit() and int(value) in valid_role_ids]
            queryset = queryset.filter(job_role_id__in=allowed_ids) if allowed_ids else queryset.none()
        elif ',' in role:
            queryset = queryset.filter(job_role_id__in=[value.strip() for value in role.split(',') if value.strip()])
        else:
            queryset = queryset.filter(job_role_id=role)

    gender = query_params.get('gender')
    if gender and gender.lower() != 'all':
        queryset = queryset.filter(gender__iexact=gender)

    status_param = query_params.get('employment_status')
    if status_param and status_param.lower() != 'all':
        queryset = queryset.filter(employment_status__iexact=status_param)

    attrition = query_params.get('attrition_status')
    if attrition and attrition.lower() != 'all':
        queryset = queryset.filter(attrition_status__iexact=attrition)

    age_min = query_params.get('age_min')
    if age_min:
        try: queryset = queryset.filter(age__gte=int(age_min))
        except ValueError: pass

    age_max = query_params.get('age_max')
    if age_max:
        try: queryset = queryset.filter(age__lte=int(age_max))
        except ValueError: pass

    sal_min = query_params.get('salary_min')
    if sal_min:
        try: queryset = queryset.filter(salary__gte=float(sal_min))
        except ValueError: pass

    sal_max = query_params.get('salary_max')
    if sal_max:
        try: queryset = queryset.filter(salary__lte=float(sal_max))
        except ValueError: pass

    exp_min = query_params.get('experience_min')
    if exp_min:
        try: queryset = queryset.filter(experience__gte=float(exp_min))
        except ValueError: pass

    exp_max = query_params.get('experience_max')
    if exp_max:
        try: queryset = queryset.filter(experience__lte=float(exp_max))
        except ValueError: pass

    year = query_params.get('year')
    if year:
        try: queryset = queryset.filter(joining_date__year=int(year))
        except ValueError: pass

    risk_level = query_params.get('risk_level')
    if risk_level and risk_level.lower() != 'all':
        queryset = queryset.filter(predictions__risk_level__iexact=risk_level).distinct()

    return queryset


class EmployeeViewSet(viewsets.ModelViewSet):
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee_id', 'name', 'email', 'phone',
        'department__department_name', 'job_role__role_name'
    ]
    ordering_fields = [
        'employee_id', 'name', 'salary', 'experience',
        'age', 'joining_date', 'performance_score',
        'satisfaction_score', 'created_at'
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Employee.objects.select_related('department', 'job_role').prefetch_related('predictions').all()

        # Role-based scoping
        if user.role == 'MANAGER':
            queryset = queryset.filter(department=user.department) if user.department else queryset.none()
        elif user.role == 'EMPLOYEE':
            queryset = queryset.filter(id=user.employee.id) if user.employee else queryset.none()

        # Apply global filter parameters
        queryset = filter_employee_queryset(queryset, self.request.query_params, user)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EmployeeDetailSerializer
        return EmployeeSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'import_data']:
            return [IsHRAdmin()]
        if self.action in ['update', 'partial_update']:
            return [IsHRAdminOrManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        employee = serializer.save()
        # Automatically generate baseline prediction
        try:
            from predictions.ml_engine import ml_service
            ml_service.predict_single_employee(employee)
        except Exception:
            pass

    def perform_update(self, serializer):
        with transaction.atomic():
            employee = serializer.save()
            account = User.objects.select_for_update().filter(employee=employee).first()
            if account and (account.email != employee.email or account.full_name != employee.name):
                account.email = employee.email
                account.full_name = employee.name
                account.save(update_fields=['email', 'full_name', 'updated_at'])
        try:
            from predictions.ml_engine import ml_service
            ml_service.predict_single_employee(employee)
        except Exception:
            pass

    @action(detail=False, methods=['post'], url_path='import')
    def import_data(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'No file uploaded. Please upload a CSV or Excel file.'}, status=status.HTTP_400_BAD_REQUEST)
        
        file_obj = request.FILES['file']
        result = process_employee_import(file_obj, request.user)
        if not result['success']:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='export')
    def export_data(self, request):
        queryset = self.get_queryset()
        export_format = request.query_params.get('export_format', 'csv')
        return export_employees(queryset, export_format=export_format)

    @action(detail=False, methods=['get'], url_path='import-logs')
    def import_logs(self, request):
        logs = ImportLog.objects.select_related('uploaded_by').all()[:20]
        serializer = ImportLogSerializer(logs, many=True)
        return Response(serializer.data)


class PerformanceRecordViewSet(viewsets.ModelViewSet):
    queryset = PerformanceRecord.objects.select_related('employee').all()
    serializer_class = PerformanceRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == 'MANAGER':
            queryset = queryset.filter(employee__department=user.department) if user.department else queryset.none()
        elif user.role == 'EMPLOYEE':
            queryset = queryset.filter(employee=user.employee) if user.employee else queryset.none()
        emp_id = self.request.query_params.get('employee_id')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHRAdminOrManager()]
        return [permissions.IsAuthenticated()]


class SatisfactionRecordViewSet(viewsets.ModelViewSet):
    queryset = SatisfactionRecord.objects.select_related('employee').all()
    serializer_class = SatisfactionRecordSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == 'MANAGER':
            queryset = queryset.filter(employee__department=user.department) if user.department else queryset.none()
        elif user.role == 'EMPLOYEE':
            queryset = queryset.filter(employee=user.employee) if user.employee else queryset.none()
        emp_id = self.request.query_params.get('employee_id')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsHRAdminOrManager()]
        return [permissions.IsAuthenticated()]
