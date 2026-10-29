from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from accounts.models import User
from .models import ModelMetadata
from .views import ModelPerformanceView


class ModelPerformanceViewTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			email='hr-admin@example.test',
			password='test-password-123',
			role='HR_ADMIN',
		)
		self.factory = APIRequestFactory()

	def test_performance_reports_active_model_without_training(self):
		ModelMetadata.objects.create(
			model_name='Logistic Regression',
			accuracy=0.8,
			precision=0.75,
			recall=0.7,
			f1_score=0.72,
			is_active=True,
		)
		request = self.factory.get('/api/ml/performance/')
		force_authenticate(request, user=self.user)

		response = ModelPerformanceView.as_view()(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['champion_model'], 'Logistic Regression')
		self.assertEqual(len(response.data['models']), 1)
