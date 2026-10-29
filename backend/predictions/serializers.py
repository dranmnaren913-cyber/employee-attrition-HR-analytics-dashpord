from rest_framework import serializers
from .models import Prediction, ModelMetadata
from employees.models import Employee

class PredictionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.department_name', read_only=True)
    job_role_name = serializers.CharField(source='employee.job_role.role_name', read_only=True)
    satisfaction_score = serializers.IntegerField(source='employee.satisfaction_score', read_only=True)
    overtime = serializers.CharField(source='employee.overtime', read_only=True)

    class Meta:
        model = Prediction
        fields = [
            'id', 'employee', 'employee_name', 'employee_code',
            'department_name', 'job_role_name', 'satisfaction_score',
            'overtime', 'risk_level', 'probability', 'model_name',
            'contributing_factors', 'prediction_date'
        ]
        read_only_fields = ['id', 'prediction_date']


class ModelMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelMetadata
        fields = [
            'id', 'model_name', 'accuracy', 'precision', 'recall',
            'f1_score', 'confusion_matrix', 'dataset_size',
            'train_size', 'test_size', 'features_used',
            'feature_importances', 'is_active', 'trained_at'
        ]


class SinglePredictRequestSerializer(serializers.Serializer):
    employee_id = serializers.CharField(required=False, allow_blank=True)
    age = serializers.IntegerField(required=False, default=30)
    experience = serializers.FloatField(required=False, default=2.0)
    salary = serializers.FloatField(required=False, default=50000.0)
    performance_score = serializers.IntegerField(required=False, default=3)
    satisfaction_score = serializers.IntegerField(required=False, default=3)
    work_life_balance = serializers.IntegerField(required=False, default=3)
    overtime = serializers.CharField(required=False, default='No')
    department_name = serializers.CharField(required=False, default='Engineering')
    education = serializers.CharField(required=False, default='Bachelor')
