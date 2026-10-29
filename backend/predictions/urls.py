from django.urls import path
from .views import (
    TrainModelView,
    ModelPerformanceView,
    PredictEmployeeView,
    PredictBatchView,
    HighRiskEmployeesView
)

urlpatterns = [
    path('train/', TrainModelView.as_view(), name='ml_train'),
    path('performance/', ModelPerformanceView.as_view(), name='ml_performance'),
    path('predict/', PredictEmployeeView.as_view(), name='ml_predict'),
    path('predict-batch/', PredictBatchView.as_view(), name='ml_predict_batch'),
    path('high-risk/', HighRiskEmployeesView.as_view(), name='ml_high_risk'),
]
