from django.db import models

class Department(models.Model):
    department_name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['department_name']

    def __str__(self):
        return self.department_name

class JobRole(models.Model):
    role_name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='job_roles')
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['role_name']
        unique_together = ('role_name', 'department')

    def __str__(self):
        return f"{self.role_name} ({self.department.department_name})"
