import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu, Play, RefreshCw, AlertTriangle, ShieldCheck,
  CheckCircle2, Layers, Award, TrendingDown, ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Predictions() {
  const { role } = useAuth();
  const [modelPerf, setModelPerf] = useState(null);
  const [highRiskList, setHighRiskList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState('');

  // Interactive Simulator State
  const [simData, setSimData] = useState({
    age: 28,
    experience: 1.5,
    salary: 42000,
    performance_score: 3,
    satisfaction_score: 1,
    work_life_balance: 2,
    overtime: 'Yes',
    department_name: 'Engineering',
    education: 'Bachelor',
  });
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchPerformance = async () => {
    try {
      const [perfRes, riskRes] = await Promise.all([
        api.get('/ml/performance/'),
        api.get('/ml/high-risk/')
      ]);
      setModelPerf(perfRes.data);
      setHighRiskList(riskRes.data.high_risk_employees || []);
    } catch (err) {
      console.error("Error loading ML performance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const handleTrainModels = async () => {
    setTraining(true);
    setTrainMessage('');
    try {
      const res = await api.post('/ml/train/');
      setTrainMessage(`Model training complete! Champion model: ${res.data.champion_model} across ${res.data.dataset_size} records.`);
      fetchPerformance();
    } catch (err) {
      setTrainMessage(`Training error: ${err.response?.data?.message || err.message}`);
    } finally {
      setTraining(false);
    }
  };

  const handleRunBatch = async () => {
    setTraining(true);
    try {
      const res = await api.post('/ml/predict-batch/');
      alert(`${res.data.message}\nIdentified ${res.data.high_risk_count} high-risk employees.`);
      fetchPerformance();
    } catch (err) {
      alert("Batch prediction error: " + (err.response?.data?.message || err.message));
    } finally {
      setTraining(false);
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setSimLoading(true);
    try {
      const res = await api.post('/ml/predict/', simData);
      setSimResult(res.data);
    } catch (err) {
      alert("Simulation error: " + (err.response?.data?.error || err.message));
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading ML model comparisons and inference engine..." />;

  const isHRAdmin = role === 'HR_ADMIN';
  const isHRAdminOrManager = isHRAdmin || role === 'MANAGER';

  return (
    <div className="predictions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Machine Learning Attrition Intelligence</h1>
          <p className="page-subtitle">
            Academic model evaluation (Logistic Regression, Decision Tree, Random Forest), flight simulator &amp; high-risk alerts
          </p>
        </div>
        {isHRAdminOrManager && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleRunBatch}
              disabled={training}
              className="btn btn-secondary btn-sm"
              title="Run inference across all active staff"
            >
              <Play size={14} /> Batch Scoring
            </button>
            {isHRAdmin && (
              <button
                onClick={handleTrainModels}
                disabled={training}
                className="btn btn-primary btn-sm"
              >
                <RefreshCw size={14} className={training ? 'spinner' : ''} />
                {training ? 'Training Models...' : 'Retrain & Compare Models'}
              </button>
            )}
          </div>
        )}
      </div>

      {trainMessage && (
        <div className="card" style={{ backgroundColor: 'var(--success-light)', borderColor: 'var(--success)', color: 'var(--success-text)', marginBottom: '20px' }}>
          <CheckCircle2 size={18} /> {trainMessage}
        </div>
      )}

      {/* Section 1: Academic Model Comparison Table (Section 16 requirement) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Cpu size={18} className="text-primary" />
              Machine Learning Model Comparison &amp; Evaluation
            </h3>
            <p className="card-subtitle">
              Comparison across standard ML classification algorithms using balanced class weights and stratified 80/20 train/test split
            </p>
          </div>
          <span className="badge badge-purple">Academic Demo Feature</span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Accuracy (%)</th>
                <th>Precision (%)</th>
                <th>Recall (%)</th>
                <th>F1-Score (%)</th>
                <th>Confusion Matrix [[TN, FP], [FN, TP]]</th>
                <th>Champion Status</th>
              </tr>
            </thead>
            <tbody>
              {modelPerf?.models?.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.model_name}</strong></td>
                  <td>{(m.accuracy * 100).toFixed(1)}%</td>
                  <td>{(m.precision * 100).toFixed(1)}%</td>
                  <td>{(m.recall * 100).toFixed(1)}%</td>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>
                      {(m.f1_score * 100).toFixed(1)}%
                    </strong>
                  </td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {JSON.stringify(m.confusion_matrix)}
                    </code>
                  </td>
                  <td>
                    {m.is_active ? (
                      <span className="badge badge-success">Active Champion</span>
                    ) : (
                      <span className="badge badge-primary">Evaluated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Two Column (Simulator + High Risk Table) */}
      <div className="predictions-two-col">
        {/* Interactive Attrition Simulator */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Play size={18} className="text-primary" />
                Interactive Attrition Risk Simulator
              </h3>
              <p className="card-subtitle">Adjust parameters to simulate live ML model prediction probability</p>
            </div>
          </div>

          <form onSubmit={handleSimulate}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Satisfaction Score (1-5)</label>
                <select
                  className="form-control"
                  value={simData.satisfaction_score}
                  onChange={(e) => setSimData({ ...simData, satisfaction_score: Number(e.target.value) })}
                >
                  <option value={1}>1 - Severe Dissatisfaction</option>
                  <option value={2}>2 - Low Morale</option>
                  <option value={3}>3 - Neutral</option>
                  <option value={4}>4 - Satisfied</option>
                  <option value={5}>5 - Highly Engaged</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Frequent Overtime</label>
                <select
                  className="form-control"
                  value={simData.overtime}
                  onChange={(e) => setSimData({ ...simData, overtime: e.target.value })}
                >
                  <option value="Yes">Yes (Overtime Required)</option>
                  <option value="No">No (Standard Hours)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Work-Life Balance (1-5)</label>
                <select
                  className="form-control"
                  value={simData.work_life_balance}
                  onChange={(e) => setSimData({ ...simData, work_life_balance: Number(e.target.value) })}
                >
                  <option value={1}>1 - Unhealthy Overwork</option>
                  <option value={2}>2 - Strained</option>
                  <option value={3}>3 - Moderate</option>
                  <option value={4}>4 - Good</option>
                  <option value={5}>5 - Excellent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control"
                  value={simData.experience}
                  onChange={(e) => setSimData({ ...simData, experience: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Annual Salary (₹)</label>
                <input
                  type="number"
                  step="1000"
                  className="form-control"
                  value={simData.salary}
                  onChange={(e) => setSimData({ ...simData, salary: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-control"
                  value={simData.department_name}
                  onChange={(e) => setSimData({ ...simData, department_name: e.target.value })}
                >
                  <option value="Engineering & IT">Engineering &amp; IT</option>
                  <option value="Sales & Business Dev">Sales &amp; Business Dev</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Finance & Accounting">Finance &amp; Accounting</option>
                  <option value="Marketing & Creative">Marketing &amp; Creative</option>
                  <option value="Operations & Support">Operations &amp; Support</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={simLoading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
            >
              {simLoading ? 'Evaluating Model...' : 'Calculate Departure Risk'}
            </button>
          </form>

          {/* Simulation Output Card */}
          {simResult && (
            <div className={`sim-result-box ${simResult.risk_level.toLowerCase()}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="sim-risk-title">Simulated Risk: {simResult.risk_level}</span>
                <span className="sim-prob-num">{simResult.probability}% Probability</span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Associated Driver Factors:
                </strong>
                <ul className="sim-factor-list">
                  {simResult.contributing_factors?.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* High Risk Employees Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <AlertTriangle size={18} className="text-danger" />
                High-Risk Retention Alerts
              </h3>
              <p className="card-subtitle">Active employees with ML flight probability &gt;65%</p>
            </div>
            <span className="badge badge-danger">{highRiskList.length} Flagged</span>
          </div>

          {highRiskList.length === 0 ? (
            <div className="state-box" style={{ padding: '30px' }}>
              <ShieldCheck size={32} className="text-success" style={{ marginBottom: '8px' }} />
              <p style={{ fontWeight: 600 }}>No high-risk attrition alerts detected</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current active workforce retention signals are stable.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Risk %</th>
                    <th>Satisfaction</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskList.map(item => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.employee_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.employee_code}</div>
                      </td>
                      <td>{item.department_name}</td>
                      <td>
                        <span className="badge badge-danger">
                          {item.probability}%
                        </span>
                      </td>
                      <td>{item.satisfaction_score} / 5</td>
                      <td>
                        <Link to={`/employees/${item.employee}`} className="btn btn-secondary btn-sm">
                          Inspect <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .predictions-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .predictions-two-col {
            grid-template-columns: 1fr;
          }
        }
        .sim-result-box {
          margin-top: 18px;
          padding: 16px;
          border-radius: var(--radius-md);
          background-color: var(--bg-surface-alt);
          border: 1px solid var(--border-color);
        }
        .sim-result-box.high {
          background-color: var(--danger-light);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .sim-result-box.medium {
          background-color: var(--warning-light);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .sim-result-box.low {
          background-color: var(--success-light);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .sim-risk-title {
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--text-main);
        }
        .sim-prob-num {
          font-weight: 900;
          font-size: 1.2rem;
          color: var(--text-main);
        }
        .sim-factor-list {
          margin-top: 6px;
          padding-left: 20px;
          font-size: 0.825rem;
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}
