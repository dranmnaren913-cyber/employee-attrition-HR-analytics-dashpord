from rest_framework import views, permissions, status
from rest_framework.response import Response
from accounts.permissions import IsHRAdmin, IsHRAdminOrManager
from .models import ReportLog
from .services import generate_hr_report

class GenerateReportView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def post(self, request):
        report_type = request.data.get('report_type', 'attrition_summary')
        export_format = request.data.get('format', 'PDF')
        query_params = request.data.get('filters', {})

        return generate_hr_report(
            report_type=report_type,
            export_format=export_format,
            user=request.user,
            query_params=query_params
        )


class ReportLogListView(views.APIView):
    permission_classes = [IsHRAdminOrManager]

    def get(self, request):
        logs = ReportLog.objects.select_related('generated_by').all()[:25]
        data = [
            {
                'id': log.id,
                'title': log.title,
                'report_type': log.report_type,
                'format': log.format,
                'filters_applied': log.filters_applied,
                'generated_by': log.generated_by.full_name if log.generated_by else 'System Admin',
                'created_at': log.created_at
            }
            for log in logs
        ]
        return Response(data)
