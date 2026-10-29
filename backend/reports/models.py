from django.db import models
from django.conf import settings

class ReportLog(models.Model):
    REPORT_TYPE_CHOICES = (
        ('attrition_summary', 'Attrition Summary Report'),
        ('department_report', 'Department Analytics Report'),
        ('salary_report', 'Salary & Compensation Report'),
        ('performance_report', 'Performance Evaluation Report'),
        ('satisfaction_report', 'Employee Satisfaction Report'),
        ('high_risk_report', 'High Risk Attrition Report'),
        ('employee_summary', 'Employee Directory Report'),
    )

    FORMAT_CHOICES = (
        ('PDF', 'PDF Document'),
        ('CSV', 'CSV Spreadsheet'),
        ('EXCEL', 'Excel Workbook'),
    )

    title = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    filters_applied = models.JSONField(default=dict, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.format}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
