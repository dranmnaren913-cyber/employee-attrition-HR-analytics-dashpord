from django.db import models
from django.conf import settings
from departments.models import Department, JobRole

class Employee(models.Model):
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )

    EDUCATION_CHOICES = (
        ('High School', 'High School'),
        ('Associate Degree', 'Associate Degree'),
        ('Bachelor', 'Bachelor'),
        ('Master', 'Master'),
        ('Doctorate', 'Doctorate'),
    )

    EMPLOYMENT_STATUS_CHOICES = (
        ('Active', 'Active'),
        ('On Leave', 'On Leave'),
        ('Resigned', 'Resigned'),
        ('Terminated', 'Terminated'),
    )

    ATTRITION_STATUS_CHOICES = (
        ('No', 'No'),
        ('Yes', 'Yes'),
    )

    OVERTIME_CHOICES = (
        ('No', 'No'),
        ('Yes', 'Yes'),
    )

    employee_id = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=150, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male')
    age = models.PositiveIntegerField(default=30)
    education = models.CharField(max_length=50, choices=EDUCATION_CHOICES, default='Bachelor')
    
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='employees')
    job_role = models.ForeignKey(JobRole, on_delete=models.PROTECT, related_name='employees')
    
    joining_date = models.DateField()
    experience = models.FloatField(default=1.0, help_text="Total experience in years")
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=50000.00)
    
    performance_score = models.IntegerField(default=3, help_text="Scale 1 to 5")
    satisfaction_score = models.IntegerField(default=3, help_text="Scale 1 to 5")
    work_life_balance = models.IntegerField(default=3, help_text="Scale 1 to 5")
    
    overtime = models.CharField(max_length=5, choices=OVERTIME_CHOICES, default='No')
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS_CHOICES, default='Active')
    attrition_status = models.CharField(max_length=5, choices=ATTRITION_STATUS_CHOICES, default='No')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['department', 'attrition_status']),
            models.Index(fields=['job_role', 'attrition_status']),
            models.Index(fields=['employment_status']),
        ]

    def __str__(self):
        return f"{self.employee_id} - {self.name}"

    @property
    def is_attrited(self):
        return self.attrition_status == 'Yes' or self.employment_status in ('Resigned', 'Terminated')


class PerformanceRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='performance_records')
    performance_score = models.IntegerField(default=3)
    review_date = models.DateField()
    remarks = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-review_date']

    def __str__(self):
        return f"{self.employee.employee_id} - Score: {self.performance_score} ({self.review_date})"


class SatisfactionRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='satisfaction_records')
    satisfaction_score = models.IntegerField(default=3)
    review_date = models.DateField()
    feedback = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-review_date']

    def __str__(self):
        return f"{self.employee.employee_id} - Satisfaction: {self.satisfaction_score} ({self.review_date})"


class ImportLog(models.Model):
    filename = models.CharField(max_length=255)
    total_records = models.IntegerField(default=0)
    successful_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='import_logs'
    )
    error_details = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Import {self.filename} ({self.successful_records}/{self.total_records}) on {self.created_at.strftime('%Y-%m-%d %H:%M')}"
