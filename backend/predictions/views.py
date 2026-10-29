from rest_framework import views, status
from rest_framework.response import Response
from accounts.permissions import IsHRAdmin, IsHRAdminOrManager
from employees.models import Employee
from .models import Prediction, ModelMetadata
from .serializers import PredictionSerializer, ModelMetadataSerializer, SinglePredictRequestSerializer
from .ml_engine import ml_service

class TrainModelView(views.APIView):
    permission_classes = [IsHRAdmin]

    def post(self, request):
        result = ml_service.train_models()
        if not result['success']:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class ModelPerformanceView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def get(self, request):
        models = ModelMetadata.objects.all()[:10]
        serializer = ModelMetadataSerializer(models, many=True)
        active_model = ModelMetadata.objects.filter(is_active=True).first()
        return Response({
            'models': serializer.data,
            'champion_model': active_model.model_name if active_model else None,
            'features_evaluated': ml_service.feature_names
        })


class PredictEmployeeView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def post(self, request):
        serializer = SinglePredictRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        emp_code = serializer.validated_data.get('employee_id')
        if emp_code:
            queryset = Employee.objects.select_related('department', 'job_role').all()
            if request.user.role == 'MANAGER':
                queryset = queryset.filter(department=request.user.department) if request.user.department else queryset.none()
            try:
                emp = queryset.get(employee_id=emp_code)
                pred_result = ml_service.predict_single_employee(emp)
                return Response({
                    'employee_id': emp.employee_id,
                    'name': emp.name,
                    'department': emp.department.department_name,
                    'job_role': emp.job_role.role_name,
                    **pred_result
                }, status=status.HTTP_200_OK)
            except Employee.DoesNotExist:
                return Response({'error': f"Employee with ID '{emp_code}' not found."}, status=status.HTTP_404_NOT_FOUND)

        # Custom hypothetical prediction
        pred_result = ml_service.predict_single_employee(serializer.validated_data)
        return Response({
            'input_data': serializer.validated_data,
            **pred_result
        }, status=status.HTTP_200_OK)


class PredictBatchView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def post(self, request):
        employees = Employee.objects.select_related('department', 'job_role').filter(employment_status='Active')
        if request.user.role == 'MANAGER':
            employees = employees.filter(department=request.user.department) if request.user.department else employees.none()
        total = employees.count()
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0

        for emp in employees:
            res = ml_service.predict_single_employee(emp)
            if res['risk_level'] == 'High':
                high_risk_count += 1
            elif res['risk_level'] == 'Medium':
                medium_risk_count += 1
            else:
                low_risk_count += 1

        return Response({
            'message': f"Batch prediction completed for {total} active employees.",
            'total_evaluated': total,
            'high_risk_count': high_risk_count,
            'medium_risk_count': medium_risk_count,
            'low_risk_count': low_risk_count
        }, status=status.HTTP_200_OK)


class HighRiskEmployeesView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def get(self, request):
        user = request.user
        # Get employees whose latest prediction is 'High'
        predictions = Prediction.objects.select_related(
            'employee', 'employee__department', 'employee__job_role'
        ).filter(risk_level='High', employee__employment_status='Active')

        if user.role == 'MANAGER' and user.department:
            predictions = predictions.filter(employee__department=user.department)

        # Distinct by employee ID
        seen = set()
        unique_high_risk = []
        for p in predictions.order_by('-probability', '-prediction_date'):
            if p.employee_id not in seen:
                seen.add(p.employee_id)
                unique_high_risk.append(p)

        serializer = PredictionSerializer(unique_high_risk[:50], many=True)
        return Response({
            'count': len(unique_high_risk),
            'high_risk_employees': serializer.data
        })
