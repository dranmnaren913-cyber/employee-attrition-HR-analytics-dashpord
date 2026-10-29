from rest_framework import serializers
from .models import Department, JobRole

class JobRoleSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = JobRole
        fields = ['id', 'role_name', 'department', 'department_name', 'description', 'employee_count', 'created_at']

    def get_employee_count(self, obj):
        return obj.employees.count()


class DepartmentSerializer(serializers.ModelSerializer):
    job_roles = JobRoleSerializer(many=True, read_only=True)
    employee_count = serializers.SerializerMethodField()
    attrited_count = serializers.SerializerMethodField()
    attrition_rate = serializers.SerializerMethodField()
    avg_salary = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'department_name', 'code', 'description',
            'employee_count', 'attrited_count', 'attrition_rate',
            'avg_salary', 'job_roles', 'created_at'
        ]

    def get_employee_count(self, obj):
        return obj.employees.count()

    def get_attrited_count(self, obj):
        return obj.employees.filter(attrition_status='Yes').count()

    def get_attrition_rate(self, obj):
        total = obj.employees.count()
        if total == 0:
            return 0.0
        attrited = obj.employees.filter(attrition_status='Yes').count()
        return round((attrited / total) * 100, 2)

    def get_avg_salary(self, obj):
        from django.db.models import Avg
        res = obj.employees.aggregate(avg_sal=Avg('salary'))
        return round(res['avg_sal'] or 0.0, 2)
