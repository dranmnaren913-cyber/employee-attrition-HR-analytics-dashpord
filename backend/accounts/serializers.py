from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.db import transaction
from departments.models import Department
from employees.models import Employee

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'
    selected_role = serializers.ChoiceField(choices=User.ROLE_CHOICES, write_only=True)

    def validate(self, attrs):
        selected_role = attrs.pop('selected_role')
        data = super().validate(attrs)
        if self.user.role != selected_role:
            raise serializers.ValidationError({
                'detail': 'These credentials do not match the selected role.'
            })
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'full_name': self.user.full_name or self.user.email.split('@')[0].capitalize(),
            'role': self.user.role,
            'department_id': self.user.department_id,
            'department_name': self.user.department.department_name if self.user.department else None,
            'employee_id': self.user.employee.employee_id if self.user.employee else None,
            'employee_db_id': self.user.employee.id if self.user.employee else None,
        }
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': 'Current password is incorrect.'})
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    employee_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'department',
            'department_name', 'employee', 'employee_id', 'employee_details',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'role', 'created_at', 'employee']

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if not request or request.user.role != 'HR_ADMIN':
            fields['email'].read_only = True
        return fields

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def update(self, instance, validated_data):
        user = super().update(instance, validated_data)
        if user.employee:
            user.employee.name = user.full_name
            user.employee.email = user.email
            user.employee.save(update_fields=['name', 'email', 'updated_at'])
        return user

    def get_employee_details(self, obj):
        if not obj.employee:
            return None
        emp = obj.employee
        return {
            'id': emp.id,
            'employee_id': emp.employee_id,
            'name': emp.name,
            'phone': emp.phone,
            'gender': emp.gender,
            'age': emp.age,
            'education': emp.education,
            'job_role': emp.job_role.role_name if emp.job_role else None,
            'joining_date': emp.joining_date,
            'experience': emp.experience,
            'salary': float(emp.salary),
            'performance_score': emp.performance_score,
            'satisfaction_score': emp.satisfaction_score,
            'work_life_balance': emp.work_life_balance,
            'overtime': emp.overtime,
            'employment_status': emp.employment_status,
            'attrition_status': emp.attrition_status,
        }


class HRRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        if User.objects.filter(role='HR_ADMIN').exists():
            raise serializers.ValidationError({
                'detail': 'HR account registration is closed. Ask an HR administrator to create your account.'
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(role='HR_ADMIN', **validated_data)


class EmployeeAccountProfileSerializer(serializers.ModelSerializer):
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False
    )

    class Meta:
        model = Employee
        fields = [
            'employee_id', 'department', 'job_role', 'joining_date', 'phone',
            'gender', 'age', 'education', 'experience', 'salary',
            'performance_score', 'satisfaction_score', 'work_life_balance',
            'overtime', 'employment_status', 'attrition_status'
        ]
        extra_kwargs = {
            'department': {'required': False},
        }


class UserAccountCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True
    )
    employee_profile = EmployeeAccountProfileSerializer(required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        request = self.context['request']
        actor = request.user
        role = attrs['role']
        department = attrs.get('department')
        employee_profile = attrs.get('employee_profile')

        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        if actor.role not in ('HR_ADMIN', 'MANAGER'):
            raise serializers.ValidationError({'detail': 'You cannot create accounts.'})
        if actor.role == 'MANAGER' and role != 'EMPLOYEE':
            raise serializers.ValidationError({'role': 'Managers can only create employee accounts.'})
        if role == 'MANAGER' and not department:
            raise serializers.ValidationError({'department': 'A department is required for manager accounts.'})
        if role == 'EMPLOYEE':
            if not employee_profile:
                raise serializers.ValidationError({
                    'employee_profile': 'Employee details are required to create an employee account.'
                })
            if Employee.objects.filter(email__iexact=attrs['email']).exists():
                raise serializers.ValidationError({'email': 'An employee record already uses this email.'})
            profile_department = employee_profile.get('department')
            if actor.role == 'MANAGER':
                if not actor.department_id:
                    raise serializers.ValidationError({'detail': 'Assign your manager account to a department first.'})
                if profile_department and profile_department.pk != actor.department_id:
                    raise serializers.ValidationError({'employee_profile': {'department': 'Employees must belong to your department.'}})
                profile_department = actor.department
            elif not profile_department:
                raise serializers.ValidationError({'employee_profile': {'department': 'A department is required.'}})

            if employee_profile['job_role'].department_id != profile_department.pk:
                raise serializers.ValidationError({'employee_profile': {'job_role': 'Select a job role in the employee department.'}})
            employee_profile['department'] = profile_department
        elif employee_profile:
            raise serializers.ValidationError({'employee_profile': 'Only employee accounts can have employee details.'})

        if role != 'MANAGER' and department:
            raise serializers.ValidationError({'department': 'Only manager accounts can be assigned a department.'})
        return attrs

    def create(self, validated_data):
        actor = self.context['request'].user
        validated_data.pop('confirm_password')
        employee_profile = validated_data.pop('employee_profile', None)
        role = validated_data['role']

        with transaction.atomic():
            employee = None
            if employee_profile:
                employee_profile['name'] = validated_data['full_name']
                employee_profile['email'] = validated_data['email']
                employee = Employee.objects.create(**employee_profile)
                validated_data['department'] = employee.department

            return User.objects.create_user(
                **validated_data,
                employee=employee,
                created_by=actor,
            )


class ManagedAccountSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True, allow_null=True)
    employee_record_id = serializers.CharField(source='employee.employee_id', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'role', 'department', 'department_name',
            'employee_record_id', 'created_by', 'created_by_name', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.full_name or obj.created_by.email


class ManagedAccountUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(min_length=8, write_only=True, required=False, allow_blank=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'is_active', 'password', 'confirm_password']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password or confirm_password:
            if not password or not confirm_password:
                raise serializers.ValidationError({'password': 'Both password fields are required when updating the password.'})
            if password != confirm_password:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
            if len(password) < 8:
                raise serializers.ValidationError({'password': 'Password must be at least 8 characters long.'})

        return attrs

    def validate_is_active(self, value):
        request = self.context['request']
        if not value and self.instance.pk == request.user.pk:
            raise serializers.ValidationError('You cannot deactivate your own account.')
        if not value and self.instance.role == 'HR_ADMIN':
            active_hr_count = User.objects.filter(role='HR_ADMIN', is_active=True).count()
            if active_hr_count <= 1:
                raise serializers.ValidationError('At least one active HR administrator is required.')
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=['password'])
        if user.employee:
            user.employee.name = user.full_name
            user.employee.email = user.email
            user.employee.save(update_fields=['name', 'email', 'updated_at'])
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("No account found with this email address.")
        return value


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.RegexField(regex=r'^\d{6}$', min_length=6, max_length=6)
    new_password = serializers.CharField(min_length=6, write_only=True)
