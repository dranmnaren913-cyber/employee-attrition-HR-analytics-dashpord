from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Employee, PerformanceRecord, SatisfactionRecord, ImportLog
from departments.models import Department, JobRole
from predictions.models import Prediction

class PerformanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceRecord
        fields = ['id', 'employee', 'performance_score', 'review_date', 'remarks', 'created_at']
        read_only_fields = ['id', 'created_at']


class SatisfactionRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = SatisfactionRecord
        fields = ['id', 'employee', 'satisfaction_score', 'review_date', 'feedback', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    job_role_name = serializers.CharField(source='job_role.role_name', read_only=True)
    risk_level = serializers.SerializerMethodField()
    probability = serializers.SerializerMethodField()
    contributing_factors = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'employee_id', 'name', 'email', 'phone', 'gender',
            'age', 'education', 'department', 'department_name',
            'job_role', 'job_role_name', 'joining_date', 'experience',
            'salary', 'performance_score', 'satisfaction_score',
            'work_life_balance', 'overtime', 'employment_status',
            'attrition_status', 'risk_level', 'probability',
            'contributing_factors', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user.role == 'MANAGER':
            department = attrs.get('department', self.instance.department if self.instance else None)
            job_role = attrs.get('job_role', self.instance.job_role if self.instance else None)
            manager_department_id = request.user.department_id
            if not manager_department_id:
                raise serializers.ValidationError({'department': 'Assign your manager account to a department first.'})
            if department and department.pk != manager_department_id:
                raise serializers.ValidationError({'department': 'Managers can only manage employees in their department.'})
            if job_role and job_role.department_id != manager_department_id:
                raise serializers.ValidationError({'job_role': 'The job role must remain in your department.'})
        return attrs

    def validate_email(self, value):
        users = get_user_model().objects.filter(email__iexact=value)
        if self.instance:
            users = users.exclude(employee=self.instance)
        if users.exists():
            raise serializers.ValidationError('This email is already used by an account.')
        return value.lower()

    def get_latest_prediction(self, obj):
        if not hasattr(obj, '_cached_prediction'):
            obj._cached_prediction = obj.predictions.order_by('-prediction_date').first()
        return obj._cached_prediction

    def get_risk_level(self, obj):
        pred = self.get_latest_prediction(obj)
        if pred:
            return pred.risk_level
        # Fallback heuristic calculation if not yet trained
        score = 0
        if obj.satisfaction_score <= 2: score += 35
        if obj.overtime == 'Yes': score += 25
        if obj.work_life_balance <= 2: score += 20
        if obj.experience < 2: score += 10
        if obj.performance_score <= 2: score += 10
        if score >= 65: return 'High'
        if score >= 35: return 'Medium'
        return 'Low'

    def get_probability(self, obj):
        pred = self.get_latest_prediction(obj)
        if pred:
            return round(pred.probability, 1)
        score = 15.0
        if obj.satisfaction_score <= 2: score += 35.0
        if obj.overtime == 'Yes': score += 25.0
        if obj.work_life_balance <= 2: score += 15.0
        if obj.experience < 2: score += 8.0
        return min(round(score, 1), 95.0)

    def get_contributing_factors(self, obj):
        pred = self.get_latest_prediction(obj)
        if pred and pred.contributing_factors:
            return pred.contributing_factors
        factors = []
        if obj.satisfaction_score <= 2:
            factors.append('Low employee satisfaction score')
        if obj.overtime == 'Yes':
            factors.append('Frequent overtime requirements')
        if obj.work_life_balance <= 2:
            factors.append('Poor work-life balance rating')
        if obj.experience < 2:
            factors.append('Early career tenure / limited experience')
        if obj.salary < 40000:
            factors.append('Below-median departmental compensation')
        return factors or ['Stable operational metrics']

    def validate_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Salary must be a positive value.")
        return value

    def validate_age(self, value):
        if value < 18 or value > 80:
            raise serializers.ValidationError("Employee age must be between 18 and 80.")
        return value

    def validate_performance_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Performance score must be between 1 and 5.")
        return value

    def validate_satisfaction_score(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Satisfaction score must be between 1 and 5.")
        return value

    def validate_work_life_balance(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Work-life balance must be between 1 and 5.")
        return value


class EmployeeDetailSerializer(EmployeeSerializer):
    performance_records = PerformanceRecordSerializer(many=True, read_only=True)
    satisfaction_records = SatisfactionRecordSerializer(many=True, read_only=True)

    class Meta(EmployeeSerializer.Meta):
        fields = EmployeeSerializer.Meta.fields + ['performance_records', 'satisfaction_records']


class ImportLogSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)

    class Meta:
        model = ImportLog
        fields = [
            'id', 'filename', 'total_records', 'successful_records',
            'failed_records', 'uploaded_by', 'uploaded_by_name',
            'error_details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
