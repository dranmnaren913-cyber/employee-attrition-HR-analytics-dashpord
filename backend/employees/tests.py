from datetime import date
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from departments.models import Department, JobRole
from .models import Employee


class EmployeeExportTests(TestCase):
	def setUp(self):
		user_model = get_user_model()
		user = user_model.objects.create_user(
			email='export@example.com',
			password='test-password',
			role='HR_ADMIN',
		)
		self.client = APIClient()
		self.client.force_authenticate(user=user)

	def test_export_supports_csv_and_excel(self):
		formats = {
			'csv': 'text/csv',
			'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		}

		for export_format, content_type in formats.items():
			with self.subTest(export_format=export_format):
				response = self.client.get(
					'/api/employees/export/',
					{'export_format': export_format},
				)

				self.assertEqual(response.status_code, 200)
				self.assertEqual(response['Content-Type'], content_type)
				self.assertIn('attachment;', response['Content-Disposition'])


class EmployeeAccessTests(TestCase):
	def test_manager_can_update_employee_in_assigned_department(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		job_role = JobRole.objects.create(role_name='Developer', department=department)
		employee = Employee.objects.create(
			employee_id='ENG001', name='Existing Employee', email='employee@example.com',
			department=department, job_role=job_role, joining_date=date.today(),
		)
		manager = get_user_model().objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER', department=department,
		)
		client = APIClient()
		client.force_authenticate(user=manager)

		response = client.patch(f'/api/employees/{employee.id}/', {'phone': '555-0100'}, format='json')

		self.assertEqual(response.status_code, 200)
		employee.refresh_from_db()
		self.assertEqual(employee.phone, '555-0100')

	def test_employee_edit_keeps_linked_login_details_in_sync(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		job_role = JobRole.objects.create(role_name='Developer', department=department)
		employee = Employee.objects.create(
			employee_id='ENG001', name='Existing Employee', email='employee@example.com',
			department=department, job_role=job_role, joining_date=date.today(),
		)
		account = get_user_model().objects.create_user(
			email=employee.email, full_name=employee.name, password='secure-password',
			role='EMPLOYEE', department=department, employee=employee,
		)
		manager = get_user_model().objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER', department=department,
		)
		client = APIClient()
		client.force_authenticate(user=manager)

		response = client.patch(
			f'/api/employees/{employee.id}/',
			{'name': 'Updated Employee', 'email': 'updated@example.com'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		account.refresh_from_db()
		self.assertEqual(account.full_name, 'Updated Employee')
		self.assertEqual(account.email, 'updated@example.com')

	def test_manager_cannot_move_employee_out_of_assigned_department(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		other_department = Department.objects.create(department_name='Finance', code='FIN')
		job_role = JobRole.objects.create(role_name='Developer', department=department)
		other_role = JobRole.objects.create(role_name='Analyst', department=other_department)
		employee = Employee.objects.create(
			employee_id='ENG001', name='Existing Employee', email='employee@example.com',
			department=department, job_role=job_role, joining_date=date.today(),
		)
		manager = get_user_model().objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER', department=department,
		)
		client = APIClient()
		client.force_authenticate(user=manager)

		response = client.patch(
			f'/api/employees/{employee.id}/',
			{'department': other_department.id, 'job_role': other_role.id},
			format='json',
		)

		self.assertEqual(response.status_code, 400)
		employee.refresh_from_db()
		self.assertEqual(employee.department, department)

	def test_unlinked_staff_account_cannot_list_employee_records(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		job_role = JobRole.objects.create(role_name='Developer', department=department)
		Employee.objects.create(
			employee_id='EMP001',
			name='Existing Employee',
			email='existing@example.com',
			department=department,
			job_role=job_role,
			joining_date=date.today(),
		)
		staff_user = get_user_model().objects.create_user(
			email='unlinked@example.com', password='secure-password', role='EMPLOYEE'
		)
		client = APIClient()
		client.force_authenticate(user=staff_user)

		response = client.get('/api/employees/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['count'], 0)

		analytics_response = client.get('/api/analytics/overview/')
		self.assertEqual(analytics_response.status_code, 200)
		self.assertEqual(analytics_response.data['kpis']['total_employees'], 0)

		ml_response = client.get('/api/ml/high-risk/')
		self.assertEqual(ml_response.status_code, 403)

	def test_manager_sees_only_assigned_department(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		other_department = Department.objects.create(department_name='Finance', code='FIN')
		role = JobRole.objects.create(role_name='Developer', department=department)
		other_role = JobRole.objects.create(role_name='Analyst', department=other_department)
		Employee.objects.create(
			employee_id='ENG001',
			name='Engineering Employee',
			email='engineer@example.com',
			department=department,
			job_role=role,
			joining_date=date.today(),
		)
		Employee.objects.create(
			employee_id='FIN001',
			name='Finance Employee',
			email='finance@example.com',
			department=other_department,
			job_role=other_role,
			joining_date=date.today(),
		)
		manager = get_user_model().objects.create_user(
			email='manager@example.com',
			password='secure-password',
			role='MANAGER',
			department=department,
		)
		client = APIClient()
		client.force_authenticate(user=manager)

		team_response = client.get('/api/employees/')
		analytics_response = client.get('/api/analytics/overview/')

		self.assertEqual(team_response.data['count'], 1)
		self.assertEqual(team_response.data['results'][0]['employee_id'], 'ENG001')
		self.assertEqual(analytics_response.data['kpis']['total_employees'], 1)

	def test_manager_cannot_override_department_scope_with_query_params(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		other_department = Department.objects.create(department_name='Finance', code='FIN')
		role = JobRole.objects.create(role_name='Developer', department=department)
		other_role = JobRole.objects.create(role_name='Analyst', department=other_department)
		Employee.objects.create(
			employee_id='ENG001',
			name='Engineering Employee',
			email='engineer@example.com',
			department=department,
			job_role=role,
			joining_date=date.today(),
		)
		Employee.objects.create(
			employee_id='FIN001',
			name='Finance Employee',
			email='finance@example.com',
			department=other_department,
			job_role=other_role,
			joining_date=date.today(),
		)
		manager = get_user_model().objects.create_user(
			email='manager@example.com',
			password='secure-password',
			role='MANAGER',
			department=department,
		)
		client = APIClient()
		client.force_authenticate(user=manager)

		team_response = client.get('/api/employees/', {'department': str(other_department.id)})
		analytics_response = client.get('/api/analytics/overview/', {'department': str(other_department.id)})

		self.assertEqual(team_response.data['count'], 0)
		self.assertEqual(analytics_response.data['kpis']['total_employees'], 0)
