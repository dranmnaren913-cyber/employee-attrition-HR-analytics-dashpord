from django.urls import path
from .views import GenerateReportView, ReportLogListView

urlpatterns = [
    path('generate/', GenerateReportView.as_view(), name='report_generate'),
    path('logs/', ReportLogListView.as_view(), name='report_logs'),
]
