from datetime import date
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from departments.models import Department, JobRole
from employees.models import Employee

User = get_user_model()


class HRBootstrapTests(TestCase):
	def test_default_hr_account_is_created_with_required_credentials(self):
		User.objects.filter(email='hr@gmail.com').delete()
		from accounts.models import ensure_default_hr_account

		user = ensure_default_hr_account()

		self.assertIsNotNone(user)
		self.assertEqual(user.email, 'hr@gmail.com')
		self.assertEqual(user.role, 'HR_ADMIN')
		self.assertTrue(user.check_password('hr1234'))

	def test_user_can_change_own_password(self):
		client = APIClient()
		user = User.objects.create_user(
			email='manager@example.com', password='old-password', role='MANAGER'
		)
		client.force_authenticate(user=user)

		response = client.put('/api/auth/me/', {
			'current_password': 'old-password',
			'new_password': 'new-password-123',
			'confirm_password': 'new-password-123',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		user.refresh_from_db()
		self.assertTrue(user.check_password('new-password-123'))


class HRRegistrationTests(TestCase):
	def test_first_hr_can_register_with_matching_passwords(self):
		response = self.client.post('/api/auth/register-hr/', {
			'full_name': 'First HR',
			'email': 'first-hr@example.com',
			'password': 'secure-password',
			'confirm_password': 'secure-password',
		}, format='json')

		self.assertEqual(response.status_code, 201)
		user = User.objects.get(email='first-hr@example.com')
		self.assertEqual(user.role, 'HR_ADMIN')
		self.assertIsNone(user.created_by)
		self.assertTrue(user.check_password('secure-password'))

	def test_hr_registration_rejects_password_mismatch(self):
		response = self.client.post('/api/auth/register-hr/', {
			'full_name': 'First HR',
			'email': 'first-hr@example.com',
			'password': 'secure-password',
			'confirm_password': 'different-password',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertFalse(User.objects.filter(email='first-hr@example.com').exists())

	def test_hr_registration_closes_after_first_active_hr(self):
		User.objects.create_user(email='existing-hr@example.com', password='secure-password', role='HR_ADMIN')

		response = self.client.post('/api/auth/register-hr/', {
			'full_name': 'Second HR',
			'email': 'second-hr@example.com',
			'password': 'secure-password',
			'confirm_password': 'secure-password',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertFalse(User.objects.filter(email='second-hr@example.com').exists())

	def test_hr_registration_stays_closed_when_existing_hr_is_inactive(self):
		User.objects.create_user(
			email='inactive-hr@example.com', password='secure-password', role='HR_ADMIN', is_active=False,
		)

		response = self.client.post('/api/auth/register-hr/', {
			'full_name': 'Unexpected HR',
			'email': 'unexpected-hr@example.com',
			'password': 'secure-password',
			'confirm_password': 'secure-password',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertFalse(User.objects.filter(email='unexpected-hr@example.com').exists())

	def test_public_employee_registration_route_is_removed(self):
		response = self.client.post('/api/auth/register/', {
			'full_name': 'Unapproved Employee',
			'email': 'employee@example.com',
			'password': 'secure-password',
		}, format='json')

		self.assertEqual(response.status_code, 404)


class RoleLoginTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER'
		)

	def test_login_requires_selected_role_to_match_database_role(self):
		response = self.client.post('/api/auth/login/', {
			'email': self.user.email,
			'password': 'secure-password',
			'selected_role': 'HR_ADMIN',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertIn('detail', response.data)

	def test_login_succeeds_for_matching_selected_role(self):
		response = self.client.post('/api/auth/login/', {
			'email': self.user.email,
			'password': 'secure-password',
			'selected_role': 'MANAGER',
		}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['user']['role'], 'MANAGER')

	def test_inactive_account_cannot_log_in(self):
		self.user.is_active = False
		self.user.save(update_fields=['is_active'])

		response = self.client.post('/api/auth/login/', {
			'email': self.user.email,
			'password': 'secure-password',
			'selected_role': 'MANAGER',
		}, format='json')

		self.assertEqual(response.status_code, 401)


class AccountManagementTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.admin = User.objects.create_user(
			email='admin@example.com', password='secure-password', role='HR_ADMIN'
		)
		self.client.force_authenticate(user=self.admin)
		self.department = Department.objects.create(department_name='Engineering', code='ENG')
		self.job_role = JobRole.objects.create(role_name='Developer', department=self.department)

	def manager_payload(self):
		return {
			'full_name': 'Department Manager',
			'email': 'manager@example.com',
			'password': 'secure-password',
			'confirm_password': 'secure-password',
			'role': 'MANAGER',
			'department': self.department.id,
		}

	def employee_payload(self, email='staff@example.com', employee_id='EMP001'):
		return {
			'full_name': 'New Staff Member',
			'email': email,
			'password': 'secure-password',
			'confirm_password': 'secure-password',
			'role': 'EMPLOYEE',
			'employee_profile': {
				'employee_id': employee_id,
				'department': self.department.id,
				'job_role': self.job_role.id,
				'joining_date': date.today().isoformat(),
			},
		}

	def test_hr_can_create_manager_and_creator_is_recorded(self):
		response = self.client.post('/api/auth/accounts/', self.manager_payload(), format='json')

		self.assertEqual(response.status_code, 201)
		manager = User.objects.get(email='manager@example.com')
		self.assertEqual(manager.role, 'MANAGER')
		self.assertEqual(manager.department, self.department)
		self.assertEqual(manager.created_by, self.admin)
		self.assertTrue(manager.check_password('secure-password'))

	def test_hr_can_create_employee_and_link_employee_record_atomically(self):
		response = self.client.post('/api/auth/accounts/', self.employee_payload(), format='json')

		self.assertEqual(response.status_code, 201)
		account = User.objects.get(email='staff@example.com')
		self.assertEqual(account.role, 'EMPLOYEE')
		self.assertEqual(account.created_by, self.admin)
		self.assertEqual(account.employee.email, account.email)
		self.assertEqual(account.employee.name, account.full_name)
		self.assertTrue(account.check_password('secure-password'))

	def test_account_creation_rejects_duplicate_email_case_insensitively(self):
		User.objects.create_user(email='staff@example.com', password='secure-password', role='EMPLOYEE')

		response = self.client.post(
			'/api/auth/accounts/', self.employee_payload(email='STAFF@example.com'), format='json'
		)

		self.assertEqual(response.status_code, 400)
		self.assertFalse(Employee.objects.filter(email__iexact='STAFF@example.com').exists())

	def test_manager_can_create_employee_only_in_own_department(self):
		manager = User.objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER',
			department=self.department, created_by=self.admin,
		)
		self.client.force_authenticate(user=manager)

		response = self.client.post('/api/auth/accounts/', self.employee_payload(), format='json')

		self.assertEqual(response.status_code, 201)
		account = User.objects.get(email='staff@example.com')
		self.assertEqual(account.created_by, manager)
		self.assertEqual(account.department, self.department)

	def test_manager_cannot_create_manager_accounts(self):
		manager = User.objects.create_user(
			email='manager@example.com', password='secure-password', role='MANAGER',
			department=self.department,
		)
		self.client.force_authenticate(user=manager)
		payload = self.manager_payload()
		payload['email'] = 'other-manager@example.com'

		response = self.client.post('/api/auth/accounts/', payload, format='json')

		self.assertEqual(response.status_code, 400)
		self.assertFalse(User.objects.filter(email='other-manager@example.com').exists())

	def test_employee_cannot_create_accounts(self):
		employee = User.objects.create_user(
			email='employee@example.com', password='secure-password', role='EMPLOYEE'
		)
		self.client.force_authenticate(user=employee)

		response = self.client.post('/api/auth/accounts/', self.employee_payload(), format='json')

		self.assertEqual(response.status_code, 403)

	def test_hr_can_search_edit_and_deactivate_accounts(self):
		account = User.objects.create_user(
			email='staff@example.com', password='secure-password', role='EMPLOYEE', created_by=self.admin
		)
		listing = self.client.get('/api/auth/accounts/?search=staff@example.com')
		self.assertEqual(listing.status_code, 200)
		self.assertEqual([item['id'] for item in listing.data], [account.id])

		updated = self.client.patch(f'/api/auth/accounts/{account.id}/', {
			'full_name': 'Updated Staff',
			'is_active': False,
		}, format='json')
		self.assertEqual(updated.status_code, 200)
		account.refresh_from_db()
		self.assertEqual(account.full_name, 'Updated Staff')
		self.assertFalse(account.is_active)

	def test_hr_can_update_account_password(self):
		account = User.objects.create_user(
			email='staff@example.com', password='old-password', role='EMPLOYEE', created_by=self.admin
		)

		updated = self.client.patch(f'/api/auth/accounts/{account.id}/', {
			'password': 'new-password-123',
			'confirm_password': 'new-password-123',
		}, format='json')

		self.assertEqual(updated.status_code, 200)
		account.refresh_from_db()
		self.assertTrue(account.check_password('new-password-123'))


class HRProfileUpdateTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.hr_user = User.objects.create_user(
			email='hr@example.com', password='secure-password', role='HR_ADMIN'
		)
		self.client.force_authenticate(user=self.hr_user)

	def test_hr_admin_can_change_profile_email(self):
		response = self.client.put('/api/auth/me/', {
			'email': 'new-hr@example.com',
			'full_name': 'HR Administrator',
		})

		self.assertEqual(response.status_code, 200)
		self.hr_user.refresh_from_db()
		self.assertEqual(self.hr_user.email, 'new-hr@example.com')
		self.assertEqual(response.data['user']['email'], 'new-hr@example.com')

	def test_hr_admin_cannot_change_email_to_existing_address(self):
		User.objects.create_user(email='taken@example.com', password='secure-password')

		response = self.client.put('/api/auth/me/', {'email': 'taken@example.com'})

		self.assertEqual(response.status_code, 400)
		self.hr_user.refresh_from_db()
		self.assertEqual(self.hr_user.email, 'hr@example.com')

	def test_non_admin_cannot_change_profile_email(self):
		staff_user = User.objects.create_user(
			email='staff@example.com', password='secure-password', role='EMPLOYEE'
		)
		self.client.force_authenticate(user=staff_user)

		response = self.client.put('/api/auth/me/', {'email': 'new-staff@example.com'})

		self.assertEqual(response.status_code, 200)
		staff_user.refresh_from_db()
		self.assertEqual(staff_user.email, 'staff@example.com')

	def test_employee_profile_name_updates_linked_employee_record(self):
		department = Department.objects.create(department_name='Engineering', code='ENG')
		job_role = JobRole.objects.create(role_name='Developer', department=department)
		employee = Employee.objects.create(
			employee_id='EMP100', name='Old Name', email='staff@example.com',
			department=department, job_role=job_role, joining_date=date.today(),
		)
		staff_user = User.objects.create_user(
			email=employee.email, full_name=employee.name, password='secure-password',
			role='EMPLOYEE', department=department, employee=employee,
		)
		self.client.force_authenticate(user=staff_user)

		response = self.client.put('/api/auth/me/', {'full_name': 'Updated Name'})

		self.assertEqual(response.status_code, 200)
		employee.refresh_from_db()
		self.assertEqual(employee.name, 'Updated Name')


class PasswordResetTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email='reset@example.com', password='old-password'
		)

	def test_password_reset_flow_accepts_case_insensitive_email(self):
		forgot_response = self.client.post('/api/auth/forgot-password/', {
			'email': 'RESET@example.com',
		}, format='json')

		self.assertEqual(forgot_response.status_code, 200)
		self.assertRegex(forgot_response.data['reset_code'], r'^\d{6}$')
		reset_response = self.client.post('/api/auth/reset-password/', {
			'email': 'RESET@example.com',
			'token': forgot_response.data['reset_code'],
			'new_password': 'new-password',
		}, format='json')

		self.assertEqual(reset_response.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('new-password'))
		second_reset_response = self.client.post('/api/auth/reset-password/', {
			'email': self.user.email,
			'token': forgot_response.data['reset_code'],
			'new_password': 'another-password',
		}, format='json')
		self.assertEqual(second_reset_response.status_code, 400)

	def test_password_reset_rejects_invalid_token(self):
		response = self.client.post('/api/auth/reset-password/', {
			'email': self.user.email,
			'token': '000000',
			'new_password': 'new-password',
		}, format='json')

		self.assertEqual(response.status_code, 400)
		self.user.refresh_from_db()
		self.assertTrue(self.user.check_password('old-password'))
