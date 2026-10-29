import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from departments.models import Department, JobRole
from employees.models import Employee, PerformanceRecord, SatisfactionRecord
from predictions.ml_engine import ml_service

FIRST_NAMES = [
    'Alexander', 'Emily', 'Michael', 'Sarah', 'David', 'Jessica', 'James', 'Ashley',
    'John', 'Amanda', 'Robert', 'Brittany', 'William', 'Megan', 'Christopher', 'Samantha',
    'Daniel', 'Lauren', 'Matthew', 'Elizabeth', 'Anthony', 'Rachel', 'Mark', 'Stephanie',
    'Donald', 'Hannah', 'Steven', 'Nicole', 'Paul', 'Taylor', 'Andrew', 'Alexis',
    'Joshua', 'Kayla', 'Kevin', 'Amber', 'Brian', 'Victoria', 'George', 'Courtney',
    'Edward', 'Danielle', 'Ronald', 'Rebecca', 'Timothy', 'Alyssa', 'Jason', 'Cynthia',
    'Jeffrey', 'Katherine', 'Ryan', 'Angela', 'Jacob', 'Melissa', 'Gary', 'Brenda'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
]

DEPARTMENTS_CONFIG = [
    {
        'name': 'Engineering & IT',
        'code': 'ENG',
        'desc': 'Software engineering, cloud infrastructure, and enterprise architecture.',
        'roles': ['Senior Software Engineer', 'DevOps Engineer', 'Full Stack Developer', 'Data Engineer'],
        'base_salary': 78000,
        'salary_variance': 35000
    },
    {
        'name': 'Sales & Business Dev',
        'code': 'SALES',
        'desc': 'Enterprise software sales, client relations, and account growth.',
        'roles': ['Account Executive', 'Sales Development Rep', 'Enterprise Sales Lead'],
        'base_salary': 55000,
        'salary_variance': 32000
    },
    {
        'name': 'Human Resources',
        'code': 'HR',
        'desc': 'Talent acquisition, organizational development, and employee relations.',
        'roles': ['HR Generalist', 'Technical Recruiter', 'Compensation & Benefits Lead'],
        'base_salary': 52000,
        'salary_variance': 22000
    },
    {
        'name': 'Finance & Accounting',
        'code': 'FIN',
        'desc': 'Financial forecasting, treasury, compliance, and corporate accounting.',
        'roles': ['Financial Analyst', 'Senior Accountant', 'Compliance Officer'],
        'base_salary': 64000,
        'salary_variance': 28000
    },
    {
        'name': 'Marketing & Creative',
        'code': 'MKT',
        'desc': 'Brand strategy, performance marketing, content, and digital acquisition.',
        'roles': ['Marketing Specialist', 'Growth Marketing Lead', 'Product Marketer'],
        'base_salary': 58000,
        'salary_variance': 25000
    },
    {
        'name': 'Operations & Support',
        'code': 'OPS',
        'desc': 'Client success, technical customer support, and workplace operations.',
        'roles': ['Operations Analyst', 'Customer Success Manager', 'Support Team Lead'],
        'base_salary': 46000,
        'salary_variance': 20000
    }
]

class Command(BaseCommand):
    help = 'Populates synthetic employee records, departments, and job roles without creating login accounts.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=300, help='Total employees to seed')
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        self.stdout.write(self.style.NOTICE("Initializing HR Analytics database seeder..."))

        if clear:
            self.stdout.write("Purging existing records...")
            Employee.objects.all().delete()
            JobRole.objects.all().delete()
            Department.objects.all().delete()

        # 1. Create Departments and Roles
        dept_instances = []
        roles_by_dept = {}

        for d_info in DEPARTMENTS_CONFIG:
            dept, created = Department.objects.get_or_create(
                department_name=d_info['name'],
                defaults={'code': d_info['code'], 'description': d_info['desc']}
            )
            dept_instances.append((dept, d_info))
            roles_by_dept[dept.id] = []

            for r_name in d_info['roles']:
                role, _ = JobRole.objects.get_or_create(
                    role_name=r_name,
                    department=dept,
                    defaults={'description': f"{r_name} in {d_info['name']}"}
                )
                roles_by_dept[dept.id].append(role)

        self.stdout.write(self.style.SUCCESS(f"Configured {len(dept_instances)} departments and associated job roles."))

        self.stdout.write(self.style.SUCCESS(
            "No login accounts are seeded. Register the initial HR administrator from the login page."
        ))

        # 3. Create Sample Employees
        random.seed(42) # Deterministic for consistent academic presentations
        existing_count = Employee.objects.count()
        employees_to_seed = max(0, count - existing_count)

        if employees_to_seed == 0:
            self.stdout.write(self.style.WARNING(f"Database already contains {existing_count} employees. Skipping employee generation."))
        else:
            self.stdout.write(f"Generating {employees_to_seed} realistic employee profiles...")

            new_employees = []
            today = datetime.now().date()

            for i in range(1, employees_to_seed + 1):
                emp_code = f"EMP{i:04d}"
                fn = random.choice(FIRST_NAMES)
                ln = random.choice(LAST_NAMES)
                name = f"{fn} {ln}"
                email = f"{fn.lower()}.{ln.lower()}{i}@company.com"
                gender = random.choices(['Male', 'Female', 'Other'], weights=[49, 48, 3])[0]

                # Realistic age distribution (mean 34)
                age = int(random.gauss(34, 7))
                age = max(21, min(63, age))

                # Experience aligned with age
                max_exp = max(0.5, age - 21)
                exp = round(min(max_exp, max(0.5, random.gauss(max_exp * 0.45, 3))), 1)

                # Department & Role
                dept, d_info = random.choice(dept_instances)
                role = random.choice(roles_by_dept[dept.id])

                # Salary based on department base + experience factor
                base_sal = d_info['base_salary']
                var_sal = d_info['salary_variance']
                exp_premium = exp * 3200
                sal = round(base_sal + (random.random() * var_sal) + exp_premium, 2)

                # Education
                edu = random.choices(
                    ['Bachelor', 'Master', 'Doctorate', 'High School', 'Associate Degree'],
                    weights=[55, 28, 7, 5, 5]
                )[0]

                # Work factors
                sat_score = random.choices([1, 2, 3, 4, 5], weights=[8, 14, 28, 32, 18])[0]
                perf_score = random.choices([1, 2, 3, 4, 5], weights=[5, 12, 45, 26, 12])[0]
                wlb_score = random.choices([1, 2, 3, 4, 5], weights=[10, 18, 35, 25, 12])[0]
                
                # Overtime correlated with department & wlb
                ot_weight = 40 if (dept.code in ['ENG', 'SALES'] or wlb_score <= 2) else 15
                overtime = 'Yes' if random.randint(1, 100) <= ot_weight else 'No'

                # Joining date (within past 7 years)
                tenure_days = int(min(exp * 365, random.randint(60, 2500)))
                joining_date = today - timedelta(days=tenure_days)

                # Statistical Attrition Probability generator (creates true realistic signal)
                attrition_risk_score = 0
                if sat_score == 1: attrition_risk_score += 45
                elif sat_score == 2: attrition_risk_score += 25
                elif sat_score >= 4: attrition_risk_score -= 20

                if overtime == 'Yes': attrition_risk_score += 20
                if wlb_score <= 2: attrition_risk_score += 15
                if exp < 2.0: attrition_risk_score += 12
                if sal < 45000: attrition_risk_score += 12
                if dept.code == 'SALES': attrition_risk_score += 10

                # Final determination
                is_attrited = (random.randint(1, 100) <= max(4, min(80, attrition_risk_score + 10)))

                if is_attrited:
                    attrition_status = 'Yes'
                    employment_status = random.choice(['Resigned', 'Resigned', 'Terminated'])
                else:
                    attrition_status = 'No'
                    employment_status = random.choices(['Active', 'On Leave'], weights=[96, 4])[0]

                new_employees.append(
                    Employee(
                        employee_id=emp_code,
                        name=name,
                        email=email,
                        phone=f"+1 (555) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
                        gender=gender,
                        age=age,
                        education=edu,
                        department=dept,
                        job_role=role,
                        joining_date=joining_date,
                        experience=exp,
                        salary=sal,
                        performance_score=perf_score,
                        satisfaction_score=sat_score,
                        work_life_balance=wlb_score,
                        overtime=overtime,
                        employment_status=employment_status,
                        attrition_status=attrition_status
                    )
                )

            with transaction.atomic():
                Employee.objects.bulk_create(new_employees)

            self.stdout.write(self.style.SUCCESS(f"Successfully seeded {len(new_employees)} employees."))

        # 4. Generate Performance and Satisfaction Historical Logs
        self.stdout.write("Generating performance and satisfaction review records...")
        perf_records = []
        sat_records = []
        for emp in Employee.objects.all()[:150]:
            # Add 2 historical performance reviews
            rev_date_1 = emp.joining_date + timedelta(days=180)
            rev_date_2 = emp.joining_date + timedelta(days=360)
            if rev_date_1 <= datetime.now().date():
                perf_records.append(PerformanceRecord(
                    employee=emp,
                    performance_score=max(1, min(5, emp.performance_score + random.choice([-1, 0, 1]))),
                    review_date=rev_date_1,
                    remarks="Mid-year annual performance and goals review."
                ))
                sat_records.append(SatisfactionRecord(
                    employee=emp,
                    satisfaction_score=max(1, min(5, emp.satisfaction_score + random.choice([-1, 0, 1]))),
                    review_date=rev_date_1,
                    feedback="Quarterly employee engagement and pulse check."
                ))
            if rev_date_2 <= datetime.now().date():
                perf_records.append(PerformanceRecord(
                    employee=emp,
                    performance_score=emp.performance_score,
                    review_date=rev_date_2,
                    remarks="Annual review and compensation calibration."
                ))
                sat_records.append(SatisfactionRecord(
                    employee=emp,
                    satisfaction_score=emp.satisfaction_score,
                    review_date=rev_date_2,
                    feedback="Annual workplace satisfaction index."
                ))

        if perf_records:
            PerformanceRecord.objects.bulk_create(perf_records)
            SatisfactionRecord.objects.bulk_create(sat_records)
            self.stdout.write(self.style.SUCCESS(f"Created {len(perf_records)} historical review logs."))

        # 5. Train ML Models and Generate Initial Predictions
        self.stdout.write("Training Machine Learning models (Logistic Regression, Decision Tree, Random Forest)...")
        train_res = ml_service.train_models()
        if train_res['success']:
            self.stdout.write(self.style.SUCCESS(
                f"ML models trained successfully!\n"
                f"  Evaluated Models: {len(train_res['comparison'])}\n"
                f"  Dataset Size: {train_res['dataset_size']} (Train: {train_res['train_size']}, Test: {train_res['test_size']})"
            ))
            for m in train_res['comparison']:
                self.stdout.write(f"  * {m['model_name']}: Accuracy={m['accuracy']}%, F1-Score={m['f1_score']}%, Precision={m['precision']}%, Recall={m['recall']}%")

            self.stdout.write("Running predictions for active employees...")
            high_count = 0
            for emp in Employee.objects.filter(employment_status='Active'):
                res = ml_service.predict_single_employee(emp)
                if res['risk_level'] == 'High':
                    high_count += 1
            self.stdout.write(self.style.SUCCESS(f"Batch prediction finished. High-risk employees identified: {high_count}"))
        else:
            self.stdout.write(self.style.WARNING(f"ML training note: {train_res['message']}"))

        self.stdout.write(self.style.SUCCESS("\nDatabase population completed successfully! Ready for college presentation."))
