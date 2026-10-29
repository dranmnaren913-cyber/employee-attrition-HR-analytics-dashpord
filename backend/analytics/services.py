from django.db.models import Avg, Count, Min, Max, Q, Case, When, IntegerField, FloatField
from django.db.models.functions import ExtractYear, TruncMonth
from employees.models import Employee
from employees.views import filter_employee_queryset
from predictions.models import Prediction

class AnalyticsService:

    @staticmethod
    def get_scoped_queryset(user, query_params):
        qs = Employee.objects.select_related('department', 'job_role').all()
        if user and user.is_authenticated:
            if user.role == 'MANAGER' and user.department:
                qs = qs.filter(department=user.department)
            elif user.role == 'MANAGER':
                qs = qs.none()
            elif user.role == 'EMPLOYEE':
                qs = qs.filter(id=user.employee.id) if user.employee else qs.none()
        return filter_employee_queryset(qs, query_params, user)

    @staticmethod
    def get_overview_analytics(user, query_params):
        qs = AnalyticsService.get_scoped_queryset(user, query_params)
        total = qs.count()

        if total == 0:
            return {
                'kpis': {
                    'total_employees': 0,
                    'active_employees': 0,
                    'attrited_employees': 0,
                    'attrition_rate': 0.0,
                    'average_salary': 0.0,
                    'average_satisfaction': 0.0,
                    'average_performance': 0.0,
                    'high_risk_count': 0
                },
                'charts': {
                    'attrition_by_department': [],
                    'attrition_by_role': [],
                    'attrition_by_gender': [],
                    'attrition_by_age_group': [],
                    'salary_vs_attrition': [],
                    'experience_vs_attrition': [],
                    'satisfaction_distribution': [],
                    'performance_distribution': [],
                    'attrition_trend': [],
                    'department_heatmap': []
                }
            }

        active_count = qs.filter(employment_status='Active').count()
        attrited_count = qs.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
        attrition_rate = round((attrited_count / total) * 100, 2) if total > 0 else 0.0

        aggs = qs.aggregate(
            avg_salary=Avg('salary'),
            avg_sat=Avg('satisfaction_score'),
            avg_perf=Avg('performance_score')
        )
        avg_salary = round(aggs['avg_salary'] or 0.0, 2)
        avg_sat = round(aggs['avg_sat'] or 0.0, 2)
        avg_perf = round(aggs['avg_perf'] or 0.0, 2)

        # High risk count
        high_risk_count = Prediction.objects.filter(
            employee__in=qs,
            risk_level='High',
            employee__employment_status='Active'
        ).values('employee_id').distinct().count()

        # Fallback heuristic count if predictions table is empty
        if high_risk_count == 0:
            high_risk_count = qs.filter(
                employment_status='Active',
                satisfaction_score__lte=2,
                overtime='Yes'
            ).count()

        # 1. Attrition by Department
        dept_data = []
        dept_stats = qs.values('department__department_name').annotate(
            total=Count('id'),
            attrited=Count(Case(When(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated']), then=1), output_field=IntegerField())),
            active=Count(Case(When(employment_status='Active', then=1), output_field=IntegerField())),
            avg_sal=Avg('salary'),
            avg_sat=Avg('satisfaction_score')
        ).order_by('-total')

        for item in dept_stats:
            d_tot = item['total']
            d_att = item['attrited']
            d_rate = round((d_att / d_tot) * 100, 1) if d_tot > 0 else 0.0
            dept_data.append({
                'department': item['department__department_name'] or 'Unassigned',
                'total': d_tot,
                'attrited': d_att,
                'active': item['active'],
                'attrition_rate': d_rate,
                'avg_salary': round(item['avg_sal'] or 0, 2),
                'avg_satisfaction': round(item['avg_sat'] or 0, 2)
            })

        # 2. Attrition by Job Role
        role_data = []
        role_stats = qs.values('job_role__role_name', 'department__department_name').annotate(
            total=Count('id'),
            attrited=Count(Case(When(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated']), then=1), output_field=IntegerField())),
            avg_sal=Avg('salary')
        ).order_by('-total')[:12]

        for item in role_stats:
            r_tot = item['total']
            r_att = item['attrited']
            r_rate = round((r_att / r_tot) * 100, 1) if r_tot > 0 else 0.0
            role_data.append({
                'role': item['job_role__role_name'] or 'General',
                'department': item['department__department_name'] or 'General',
                'total': r_tot,
                'attrited': r_att,
                'attrition_rate': r_rate,
                'avg_salary': round(item['avg_sal'] or 0, 2)
            })

        # 3. Attrition by Gender
        gender_data = []
        gender_stats = qs.values('gender').annotate(
            total=Count('id'),
            attrited=Count(Case(When(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated']), then=1), output_field=IntegerField()))
        )
        for g in gender_stats:
            g_tot = g['total']
            g_att = g['attrited']
            gender_data.append({
                'gender': g['gender'],
                'total': g_tot,
                'attrited': g_att,
                'attrition_rate': round((g_att / g_tot) * 100, 1) if g_tot > 0 else 0.0
            })

        # 4. Attrition by Age Group
        age_brackets = [
            ('Under 25', Q(age__lt=25)),
            ('25-34', Q(age__gte=25, age__lte=34)),
            ('35-44', Q(age__gte=35, age__lte=44)),
            ('45-54', Q(age__gte=45, age__lte=54)),
            ('55+', Q(age__gte=55)),
        ]
        age_group_data = []
        for name, query in age_brackets:
            sub = qs.filter(query)
            a_tot = sub.count()
            a_att = sub.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
            age_group_data.append({
                'age_group': name,
                'total': a_tot,
                'attrited': a_att,
                'attrition_rate': round((a_att / a_tot) * 100, 1) if a_tot > 0 else 0.0
            })

        # 5. Salary vs Attrition (Binned)
        salary_bins = [
            ('Under $40k', Q(salary__lt=40000)),
            ('$40k - $60k', Q(salary__gte=40000, salary__lt=60000)),
            ('$60k - $80k', Q(salary__gte=60000, salary__lt=80000)),
            ('$80k - $100k', Q(salary__gte=80000, salary__lt=100000)),
            ('$100k+', Q(salary__gte=100000)),
        ]
        salary_vs_attrition = []
        for s_label, s_q in salary_bins:
            sub_s = qs.filter(s_q)
            s_tot = sub_s.count()
            s_att = sub_s.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
            salary_vs_attrition.append({
                'salary_range': s_label,
                'total': s_tot,
                'attrited': s_att,
                'attrition_rate': round((s_att / s_tot) * 100, 1) if s_tot > 0 else 0.0
            })

        # 6. Experience vs Attrition
        exp_bins = [
            ('0-1 Year', Q(experience__lte=1)),
            ('1-3 Years', Q(experience__gt=1, experience__lte=3)),
            ('3-5 Years', Q(experience__gt=3, experience__lte=5)),
            ('5-10 Years', Q(experience__gt=5, experience__lte=10)),
            ('10+ Years', Q(experience__gt=10)),
        ]
        exp_vs_attrition = []
        for e_label, e_q in exp_bins:
            sub_e = qs.filter(e_q)
            e_tot = sub_e.count()
            e_att = sub_e.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
            exp_vs_attrition.append({
                'experience_bracket': e_label,
                'total': e_tot,
                'attrited': e_att,
                'attrition_rate': round((e_att / e_tot) * 100, 1) if e_tot > 0 else 0.0
            })

        # 7. Satisfaction Distribution
        sat_data = []
        for score in range(1, 6):
            sub_sat = qs.filter(satisfaction_score=score)
            s_count = sub_sat.count()
            s_att = sub_sat.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
            sat_data.append({
                'score': f"{score} Star{'s' if score > 1 else ''}",
                'rating': score,
                'count': s_count,
                'attrited': s_att,
                'attrition_rate': round((s_att / s_count) * 100, 1) if s_count > 0 else 0.0
            })

        # 8. Performance Distribution
        perf_data = []
        for score in range(1, 6):
            sub_p = qs.filter(performance_score=score)
            p_count = sub_p.count()
            p_att = sub_p.filter(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated'])).count()
            perf_data.append({
                'score': f"Level {score}",
                'level': score,
                'count': p_count,
                'attrited': p_att,
                'attrition_rate': round((p_att / p_count) * 100, 1) if p_count > 0 else 0.0
            })

        # 9. Attrition Trend over Time (by Joining Year)
        trend_stats = qs.annotate(
            year=ExtractYear('joining_date')
        ).values('year').annotate(
            total=Count('id'),
            attrited=Count(Case(When(Q(attrition_status='Yes') | Q(employment_status__in=['Resigned', 'Terminated']), then=1), output_field=IntegerField()))
        ).order_by('year')

        trend_data = []
        for t in trend_stats:
            if t['year']:
                y_tot = t['total']
                y_att = t['attrited']
                trend_data.append({
                    'year': str(t['year']),
                    'total_joined': y_tot,
                    'attrited': y_att,
                    'retained': y_tot - y_att,
                    'attrition_rate': round((y_att / y_tot) * 100, 1) if y_tot > 0 else 0.0
                })

        # 10. Department Heatmap (Cross-tabulation: Department vs Risk Profile & Metrics)
        heatmap_data = []
        for d in dept_data:
            d_name = d['department']
            dept_emp = qs.filter(department__department_name=d_name)
            high_r = dept_emp.filter(predictions__risk_level='High').values('id').distinct().count()
            if high_r == 0:
                high_r = dept_emp.filter(satisfaction_score__lte=2, overtime='Yes').count()
            med_r = dept_emp.filter(satisfaction_score=3).count()
            low_r = max(0, d['total'] - high_r - med_r)

            heatmap_data.append({
                'department': d_name,
                'total': d['total'],
                'attrition_rate': d['attrition_rate'],
                'high_risk_percentage': round((high_r / d['total']) * 100, 1) if d['total'] > 0 else 0.0,
                'avg_satisfaction': d['avg_satisfaction'],
                'avg_salary': d['avg_salary'],
                'risk_intensity': 'High' if d['attrition_rate'] > 20 else ('Medium' if d['attrition_rate'] > 10 else 'Low')
            })

        return {
            'kpis': {
                'total_employees': total,
                'active_employees': active_count,
                'attrited_employees': attrited_count,
                'attrition_rate': attrition_rate,
                'average_salary': avg_salary,
                'average_satisfaction': avg_sat,
                'average_performance': avg_perf,
                'high_risk_count': high_risk_count
            },
            'charts': {
                'attrition_by_department': dept_data,
                'attrition_by_role': role_data,
                'attrition_by_gender': gender_data,
                'attrition_by_age_group': age_group_data,
                'salary_vs_attrition': salary_vs_attrition,
                'experience_vs_attrition': exp_vs_attrition,
                'satisfaction_distribution': sat_data,
                'performance_distribution': perf_data,
                'attrition_trend': trend_data,
                'department_heatmap': heatmap_data
            }
        }

    @staticmethod
    def get_attrition_analytics(user, query_params):
        overview = AnalyticsService.get_overview_analytics(user, query_params)
        charts = overview['charts']
        kpis = overview['kpis']

        # Generate factual, grounded insights based on true data aggregations
        insights = []
        if charts['attrition_by_department']:
            highest_dept = max(charts['attrition_by_department'], key=lambda x: x['attrition_rate'])
            insights.append(f"{highest_dept['department']} exhibits the highest attrition rate at {highest_dept['attrition_rate']}% ({highest_dept['attrited']} left out of {highest_dept['total']} staff).")

        if charts['satisfaction_distribution']:
            low_sat = next((x for x in charts['satisfaction_distribution'] if x['rating'] <= 2), None)
            if low_sat and low_sat['count'] > 0:
                insights.append(f"Employees reporting Low Satisfaction (Rating 1-2) have an observed attrition rate of {low_sat['attrition_rate']}%.")

        if charts['salary_vs_attrition']:
            lowest_bracket = charts['salary_vs_attrition'][0]
            insights.append(f"The entry-level compensation bracket ({lowest_bracket['salary_range']}) experienced an attrition rate of {lowest_bracket['attrition_rate']}%.")

        return {
            'kpis': kpis,
            'insights': insights,
            'attrition_by_department': charts['attrition_by_department'],
            'attrition_by_role': charts['attrition_by_role'],
            'attrition_by_gender': charts['attrition_by_gender'],
            'attrition_by_age_group': charts['attrition_by_age_group'],
            'salary_vs_attrition': charts['salary_vs_attrition'],
            'experience_vs_attrition': charts['experience_vs_attrition'],
            'satisfaction_distribution': charts['satisfaction_distribution'],
            'performance_distribution': charts['performance_distribution'],
            'attrition_trend': charts['attrition_trend']
        }

    @staticmethod
    def get_performance_analytics(user, query_params):
        qs = AnalyticsService.get_scoped_queryset(user, query_params)
        total = qs.count()

        if total == 0:
            return {'average_performance': 0, 'distribution': [], 'by_department': [], 'vs_satisfaction': []}

        avg_perf = round(qs.aggregate(avg=Avg('performance_score'))['avg'] or 0.0, 2)

        # Department performance
        dept_perf = qs.values('department__department_name').annotate(
            avg_score=Avg('performance_score'),
            count=Count('id')
        ).order_by('-avg_score')

        # Performance vs Satisfaction cross-tabulation
        perf_vs_sat = []
        for p in range(1, 6):
            sub_p = qs.filter(performance_score=p)
            avg_sat = round(sub_p.aggregate(avg=Avg('satisfaction_score'))['avg'] or 0.0, 2)
            perf_vs_sat.append({
                'performance_level': f"Level {p}",
                'avg_satisfaction': avg_sat,
                'count': sub_p.count()
            })

        return {
            'average_performance': avg_perf,
            'total_evaluated': total,
            'by_department': [
                {
                    'department': d['department__department_name'],
                    'average_performance': round(d['avg_score'], 2),
                    'employee_count': d['count']
                } for d in dept_perf
            ],
            'performance_vs_satisfaction': perf_vs_sat,
            'distribution': [
                {
                    'level': f"Score {i}",
                    'count': qs.filter(performance_score=i).count()
                } for i in range(1, 6)
            ]
        }

    @staticmethod
    def get_salary_analytics(user, query_params):
        qs = AnalyticsService.get_scoped_queryset(user, query_params)
        total = qs.count()
        if total == 0:
            return {'average_salary': 0, 'min_salary': 0, 'max_salary': 0, 'by_department': [], 'by_experience': []}

        aggs = qs.aggregate(
            avg_sal=Avg('salary'),
            min_sal=Min('salary'),
            max_sal=Max('salary')
        )

        dept_sal = qs.values('department__department_name').annotate(
            avg_salary=Avg('salary'),
            min_salary=Min('salary'),
            max_salary=Max('salary'),
            count=Count('id')
        ).order_by('-avg_salary')

        # Salary vs experience trend
        exp_sal = [
            {'bracket': '0-1 yr', 'query': Q(experience__lte=1)},
            {'bracket': '2-3 yrs', 'query': Q(experience__gte=2, experience__lte=3)},
            {'bracket': '4-5 yrs', 'query': Q(experience__gte=4, experience__lte=5)},
            {'bracket': '6-8 yrs', 'query': Q(experience__gte=6, experience__lte=8)},
            {'bracket': '9+ yrs', 'query': Q(experience__gte=9)},
        ]
        sal_by_exp = []
        for item in exp_sal:
            sub = qs.filter(item['query'])
            sal_by_exp.append({
                'experience_bracket': item['bracket'],
                'avg_salary': round(sub.aggregate(avg=Avg('salary'))['avg'] or 0.0, 2),
                'employee_count': sub.count()
            })

        return {
            'average_salary': round(aggs['avg_sal'] or 0.0, 2),
            'min_salary': round(aggs['min_sal'] or 0.0, 2),
            'max_salary': round(aggs['max_sal'] or 0.0, 2),
            'by_department': [
                {
                    'department': d['department__department_name'],
                    'avg_salary': round(d['avg_salary'], 2),
                    'min_salary': round(d['min_salary'], 2),
                    'max_salary': round(d['max_salary'], 2),
                    'employee_count': d['count']
                } for d in dept_sal
            ],
            'salary_vs_experience': sal_by_exp
        }

    @staticmethod
    def get_satisfaction_analytics(user, query_params):
        qs = AnalyticsService.get_scoped_queryset(user, query_params)
        total = qs.count()
        if total == 0:
            return {'average_satisfaction': 0, 'distribution': [], 'by_department': []}

        avg_sat = round(qs.aggregate(avg=Avg('satisfaction_score'))['avg'] or 0.0, 2)
        avg_wlb = round(qs.aggregate(avg=Avg('work_life_balance'))['avg'] or 0.0, 2)

        dept_sat = qs.values('department__department_name').annotate(
            avg_sat=Avg('satisfaction_score'),
            avg_wlb=Avg('work_life_balance'),
            count=Count('id')
        ).order_by('-avg_sat')

        return {
            'average_satisfaction': avg_sat,
            'average_work_life_balance': avg_wlb,
            'distribution': [
                {
                    'score': f"{i} Star{'s' if i > 1 else ''}",
                    'rating': i,
                    'count': qs.filter(satisfaction_score=i).count()
                } for i in range(1, 6)
            ],
            'by_department': [
                {
                    'department': d['department__department_name'],
                    'avg_satisfaction': round(d['avg_sat'], 2),
                    'avg_work_life_balance': round(d['avg_wlb'], 2),
                    'employee_count': d['count']
                } for d in dept_sat
            ]
        }
