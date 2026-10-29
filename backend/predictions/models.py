from django.db import models
from employees.models import Employee

class Prediction(models.Model):
    RISK_LEVEL_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='predictions')
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='Low')
    probability = models.FloatField(help_text="Attrition probability in percentage (0-100)")
    model_name = models.CharField(max_length=100, default='Random Forest')
    contributing_factors = models.JSONField(default=list, blank=True)
    prediction_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-prediction_date']

    def __str__(self):
        return f"{self.employee.employee_id} - {self.risk_level} ({self.probability:.1f}%)"


class ModelMetadata(models.Model):
    model_name = models.CharField(max_length=100)
    accuracy = models.FloatField()
    precision = models.FloatField()
    recall = models.FloatField()
    f1_score = models.FloatField()
    confusion_matrix = models.JSONField(default=list)
    dataset_size = models.IntegerField(default=0)
    train_size = models.IntegerField(default=0)
    test_size = models.IntegerField(default=0)
    features_used = models.JSONField(default=list)
    feature_importances = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    trained_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-trained_at']

    def __str__(self):
        return f"{self.model_name} (F1: {self.f1_score:.3f}) - {self.trained_at.strftime('%Y-%m-%d %H:%M')}"
