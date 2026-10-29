import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
from django.conf import settings
from employees.models import Employee
from .models import ModelMetadata, Prediction

MODEL_PATH = Path(settings.ML_MODELS_DIR) / 'champion_model.joblib'
SCALER_PATH = Path(settings.ML_MODELS_DIR) / 'scaler.joblib'
METADATA_PATH = Path(settings.ML_MODELS_DIR) / 'model_metadata.joblib'

class MLEngine:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.model_name = 'Random Forest'
        self.feature_names = [
            'age', 'experience', 'salary', 'performance_score',
            'satisfaction_score', 'work_life_balance', 'overtime',
            'dept_engineering', 'dept_sales', 'dept_hr', 'dept_finance', 'dept_marketing',
            'edu_bachelor', 'edu_master', 'edu_doctorate'
        ]
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            if MODEL_PATH.exists() and SCALER_PATH.exists():
                self.model = joblib.load(MODEL_PATH)
                self.scaler = joblib.load(SCALER_PATH)
                if METADATA_PATH.exists():
                    self.model_name = joblib.load(METADATA_PATH).get('model_name', self.model_name)
        except Exception as e:
            print(f"Notice: ML artifacts not loaded yet ({e})")

    def _extract_employee_vector(self, emp):
        """Extracts standard numerical feature vector for an employee instance or dict"""
        if isinstance(emp, dict):
            age = float(emp.get('age', 30))
            experience = float(emp.get('experience', 2.0))
            salary = float(emp.get('salary', 50000.0))
            perf = int(emp.get('performance_score', 3))
            sat = int(emp.get('satisfaction_score', 3))
            wlb = int(emp.get('work_life_balance', 3))
            ot = 1 if str(emp.get('overtime', 'No')).lower() in ('yes', '1', 'true') else 0
            dept_name = str(emp.get('department_name', '')).lower()
            edu = str(emp.get('education', '')).lower()
        else:
            age = float(emp.age)
            experience = float(emp.experience)
            salary = float(emp.salary)
            perf = int(emp.performance_score)
            sat = int(emp.satisfaction_score)
            wlb = int(emp.work_life_balance)
            ot = 1 if emp.overtime == 'Yes' else 0
            dept_name = emp.department.department_name.lower() if emp.department else ''
            edu = emp.education.lower() if emp.education else ''

        vec = [
            age, experience, salary, perf, sat, wlb, ot,
            1 if 'it' in dept_name or 'eng' in dept_name else 0,
            1 if 'sales' in dept_name else 0,
            1 if 'hr' in dept_name or 'human' in dept_name else 0,
            1 if 'fin' in dept_name else 0,
            1 if 'mark' in dept_name else 0,
            1 if 'bach' in edu else 0,
            1 if 'mast' in edu else 0,
            1 if 'doc' in edu or 'phd' in edu else 0
        ]
        return np.array(vec, dtype=float)

    def train_models(self):
        """
        Trains Logistic Regression, Decision Tree, and Random Forest on all Employee records.
        Evaluates metrics, saves champion model & updates ModelMetadata in database.
        """
        employees = Employee.objects.select_related('department').all()
        if employees.count() < 10:
            return {
                'success': False,
                'message': 'Insufficient employee records to train ML models (minimum 10 required).'
            }

        X_list = []
        y_list = []

        for emp in employees:
            x_vec = self._extract_employee_vector(emp)
            y_val = 1 if emp.attrition_status == 'Yes' or emp.employment_status in ('Resigned', 'Terminated') else 0
            X_list.append(x_vec)
            y_list.append(y_val)

        X = np.array(X_list)
        y = np.array(y_list)

        # Handle class balance check
        stratify_opt = y if (np.sum(y == 1) > 2 and np.sum(y == 0) > 2) else None
        
        test_size = 0.25 if len(y) >= 40 else 0.2
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=stratify_opt
        )

        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)

        # Train 3 models
        candidate_models = {
            'Logistic Regression': LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42),
            'Decision Tree': DecisionTreeClassifier(max_depth=5, class_weight='balanced', random_state=42),
            'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=6, class_weight='balanced', random_state=42)
        }

        results = []
        best_model_name = None
        best_f1 = -1.0
        best_model_obj = None
        metadata_by_name = {}

        for name, clf in candidate_models.items():
            clf.fit(X_train_scaled, y_train)
            preds = clf.predict(X_test_scaled)

            acc = float(accuracy_score(y_test, preds))
            prec = float(precision_score(y_test, preds, zero_division=0))
            rec = float(recall_score(y_test, preds, zero_division=0))
            f1 = float(f1_score(y_test, preds, zero_division=0))
            cm = confusion_matrix(y_test, preds).tolist()

            # Feature importances
            feat_imp = {}
            if hasattr(clf, 'feature_importances_'):
                for fn, imp in zip(self.feature_names, clf.feature_importances_):
                    feat_imp[fn] = round(float(imp), 4)
            elif hasattr(clf, 'coef_'):
                for fn, imp in zip(self.feature_names, clf.coef_[0]):
                    feat_imp[fn] = round(float(abs(imp)), 4)

            meta = ModelMetadata.objects.create(
                model_name=name,
                accuracy=round(acc, 4),
                precision=round(prec, 4),
                recall=round(rec, 4),
                f1_score=round(f1, 4),
                confusion_matrix=cm,
                dataset_size=len(y),
                train_size=len(y_train),
                test_size=len(y_test),
                features_used=self.feature_names,
                feature_importances=feat_imp,
                is_active=False
            )
            metadata_by_name[name] = meta

            results.append({
                'model_name': name,
                'accuracy': round(acc * 100, 2),
                'precision': round(prec * 100, 2),
                'recall': round(rec * 100, 2),
                'f1_score': round(f1 * 100, 2),
                'confusion_matrix': cm,
                'feature_importances': feat_imp
            })

            if f1 > best_f1:
                best_f1 = f1
                best_model_name = name
                best_model_obj = clf

        chosen_clf = best_model_obj
        metadata_by_name[best_model_name].is_active = True
        metadata_by_name[best_model_name].save(update_fields=['is_active'])
        ModelMetadata.objects.exclude(pk=metadata_by_name[best_model_name].pk).update(is_active=False)
        self.model = chosen_clf
        self.scaler = scaler
        self.model_name = best_model_name

        joblib.dump(chosen_clf, MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        joblib.dump({'model_name': best_model_name}, METADATA_PATH)

        return {
            'success': True,
            'champion_model': best_model_name,
            'comparison': results,
            'dataset_size': len(y),
            'train_size': len(y_train),
            'test_size': len(y_test)
        }

    def predict_single_employee(self, emp):
        """Generates attrition risk level, probability, and key factors for an employee"""
        vec = self._extract_employee_vector(emp).reshape(1, -1)

        if self.model and self.scaler:
            try:
                scaled_vec = self.scaler.transform(vec)
                proba = float(self.model.predict_proba(scaled_vec)[0][1]) * 100.0
            except Exception:
                proba = self._heuristic_probability(emp)
        else:
            proba = self._heuristic_probability(emp)

        proba = round(max(5.0, min(95.0, proba)), 1)

        if proba >= 65.0:
            risk = 'High'
        elif proba >= 35.0:
            risk = 'Medium'
        else:
            risk = 'Low'

        factors = self._determine_contributing_factors(emp, proba)

        # Save to Prediction table if it's an Employee DB instance
        if isinstance(emp, Employee):
            Prediction.objects.create(
                employee=emp,
                risk_level=risk,
                probability=proba,
                model_name=self.model_name,
                contributing_factors=factors
            )

        return {
            'risk_level': risk,
            'probability': proba,
            'contributing_factors': factors,
            'model_name': self.model_name
        }

    def _heuristic_probability(self, emp):
        """Heuristic risk probability aligned with real HR analytics factors"""
        score = 20.0
        sat = getattr(emp, 'satisfaction_score', None) or (emp.get('satisfaction_score') if isinstance(emp, dict) else 3)
        wlb = getattr(emp, 'work_life_balance', None) or (emp.get('work_life_balance') if isinstance(emp, dict) else 3)
        perf = getattr(emp, 'performance_score', None) or (emp.get('performance_score') if isinstance(emp, dict) else 3)
        ot = getattr(emp, 'overtime', None) or (emp.get('overtime') if isinstance(emp, dict) else 'No')
        exp = getattr(emp, 'experience', None) or (emp.get('experience') if isinstance(emp, dict) else 2.0)
        salary = getattr(emp, 'salary', None) or (emp.get('salary') if isinstance(emp, dict) else 50000.0)

        if sat <= 1: score += 40.0
        elif sat == 2: score += 25.0
        elif sat >= 4: score -= 15.0

        if str(ot).capitalize() == 'Yes': score += 20.0

        if wlb <= 2: score += 15.0
        elif wlb >= 4: score -= 10.0

        if float(exp) < 2.0: score += 10.0
        elif float(exp) > 7.0: score -= 10.0

        if float(salary) < 40000.0: score += 10.0
        elif float(salary) > 85000.0: score -= 15.0

        if perf <= 2: score += 5.0

        return max(5.0, min(95.0, score))

    def _determine_contributing_factors(self, emp, proba):
        sat = getattr(emp, 'satisfaction_score', None) or (emp.get('satisfaction_score') if isinstance(emp, dict) else 3)
        wlb = getattr(emp, 'work_life_balance', None) or (emp.get('work_life_balance') if isinstance(emp, dict) else 3)
        perf = getattr(emp, 'performance_score', None) or (emp.get('performance_score') if isinstance(emp, dict) else 3)
        ot = getattr(emp, 'overtime', None) or (emp.get('overtime') if isinstance(emp, dict) else 'No')
        exp = getattr(emp, 'experience', None) or (emp.get('experience') if isinstance(emp, dict) else 2.0)
        salary = getattr(emp, 'salary', None) or (emp.get('salary') if isinstance(emp, dict) else 50000.0)

        factors = []
        if sat <= 2:
            factors.append('Low employee satisfaction score (Rating: %s/5)' % sat)
        if str(ot).capitalize() == 'Yes':
            factors.append('Frequent overtime demands reported')
        if wlb <= 2:
            factors.append('Poor work-life balance feedback (Rating: %s/5)' % wlb)
        if float(exp) < 2.5:
            factors.append('Early tenure phase / flight risk window (< 2.5 yrs)')
        if float(salary) < 42000.0:
            factors.append('Below-median departmental compensation bracket')
        if perf <= 2:
            factors.append('Sub-par performance evaluation score (%s/5)' % perf)

        if not factors:
            if proba < 35.0:
                factors = ['High employee satisfaction', 'Healthy work-life balance', 'Competitive compensation']
            else:
                factors = ['Standard tenure progression', 'Balanced performance indices']

        return factors

ml_service = MLEngine()
