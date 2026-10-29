import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Mail, Phone, Calendar, Briefcase,
  DollarSign, Award, Smile, ShieldAlert, Cpu, RefreshCw, CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function EmployeeDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const canEditEmployee = role === 'HR_ADMIN' || role === 'MANAGER';
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [livePrediction, setLivePrediction] = useState(null);

  const fetchEmployee = async () => {
    try {
      const res = await api.get(`/employees/${id}/`);
      setEmployee(res.data);
    } catch (err) {
      console.error("Error fetching employee details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const handleRunPrediction = async () => {
    if (!employee) return;
    setPredicting(true);
    try {
      const res = await api.post('/ml/predict/', { employee_id: employee.employee_id });
      setLivePrediction(res.data);
      // Refresh to update saved records
      fetchEmployee();
    } catch (err) {
      alert("Failed to compute prediction: " + (err.response?.data?.error || err.message));
    } finally {
      setPredicting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading employee dossier & risk metrics..." />;
  if (!employee) return <div className="card text-center" style={{ padding: '40px' }}>Employee not found.</div>;

  const currentRisk = livePrediction?.risk_level || employee.risk_level;
  const currentProb = livePrediction?.probability || employee.probability;
  const currentFactors = livePrediction?.contributing_factors || employee.contributing_factors || [];

  const riskBadgeClass = () => {
    if (currentRisk === 'High') return 'badge-danger';
    if (currentRisk === 'Medium') return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div className="employee-detail-page">
      <div className="page-header">
        <div>
          <Link to="/employees" className="btn btn-secondary btn-sm" style={{ marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Back to Directory
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="page-title">{employee.name}</h1>
            <span className="emp-id-pill">{employee.employee_id}</span>
            <span className={`badge ${riskBadgeClass()}`}>
              Risk: {currentRisk} ({currentProb}%)
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRunPrediction}
            disabled={predicting}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} className={predicting ? 'spinner' : ''} />
            {predicting ? 'Computing ML...' : 'Run ML Risk Prediction'}
          </button>
          {canEditEmployee && (
            <Link to={`/employees/${employee.id}/edit`} className="btn btn-secondary btn-sm">
              <Edit3 size={14} /> Edit Profile
            </Link>
          )}
        </div>
      </div>

      {/* Grid: Left Dossier + Right ML Attrition Assessment */}
      <div className="detail-layout-grid">
        {/* Left Column: Personal, Job & Compensation */}
        <div className="detail-left-col">
          {/* Card 1: Job & Contact */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3 className="card-title"><Briefcase size={18} className="text-primary" /> Employment &amp; Position</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Department</span>
                <span className="info-val"><strong>{employee.department_name}</strong></span>
              </div>
              <div className="info-item">
                <span className="info-label">Job Role</span>
                <span className="info-val">{employee.job_role_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Employment Status</span>
                <span className="info-val">
                  <span className={`badge ${employee.employment_status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                    {employee.employment_status}
                  </span>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Attrition Record</span>
                <span className="info-val">
                  <span className={`badge ${employee.attrition_status === 'Yes' ? 'badge-danger' : 'badge-primary'}`}>
                    {employee.attrition_status === 'Yes' ? 'Attrited' : 'Retained'}
                  </span>
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Joining Date</span>
                <span className="info-val">{employee.joining_date}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Experience</span>
                <span className="info-val">{employee.experience} years</span>
              </div>
            </div>
          </div>

          {/* Card 2: Compensation & Personal Profile */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h3 className="card-title"><DollarSign size={18} className="text-primary" /> Compensation &amp; Demographics</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Annual Salary</span>
                <span className="info-val" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                  ₹{Number(employee.salary).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Education</span>
                <span className="info-val">{employee.education}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Age</span>
                <span className="info-val">{employee.age} years old</span>
              </div>
              <div className="info-item">
                <span className="info-label">Gender</span>
                <span className="info-val">{employee.gender}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-val">{employee.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-val">{employee.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Historical Review Logs */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><Award size={18} className="text-primary" /> Performance &amp; Pulse History</h3>
            </div>
            {employee.performance_records?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No performance review history recorded yet.</p>
            ) : (
              <div className="review-timeline">
                {employee.performance_records?.map(rec => (
                  <div key={rec.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-top">
                        <span className="badge badge-primary">Score: {rec.performance_score}/5</span>
                        <span className="timeline-date">{rec.review_date}</span>
                      </div>
                      <p className="timeline-remarks">{rec.remarks || 'Standard evaluation review.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI / ML Attrition Assessment */}
        <div className="detail-right-col">
          <div className="card ml-risk-card">
            <div className="card-header">
              <h3 className="card-title">
                <Cpu size={18} className="text-purple" />
                AI Attrition Risk Assessment
              </h3>
              <span className="badge badge-purple">Random Forest Classifier</span>
            </div>

            {/* Risk Gauge Box */}
            <div className={`risk-score-display ${currentRisk.toLowerCase()}`}>
              <div className="risk-level-tag">{currentRisk} Turnover Risk</div>
              <div className="risk-percentage">{currentProb}%</div>
              <div className="risk-progress-track">
                <div
                  className="risk-progress-fill"
                  style={{
                    width: `${currentProb}%`,
                    backgroundColor: currentRisk === 'High' ? 'var(--danger)' : (currentRisk === 'Medium' ? 'var(--warning)' : 'var(--success)')
                  }}
                />
              </div>
              <span className="risk-helper-text">
                Model predicted departure probability based on organizational and engagement signals.
              </span>
            </div>

            {/* Core Risk Factor Indicators */}
            <div className="factors-section">
              <h4 className="factors-title">Key Contributing Features &amp; Signals:</h4>
              <div className="factors-list">
                {currentFactors.map((fac, idx) => (
                  <div key={idx} className="factor-pill">
                    <ShieldAlert size={15} className="text-warning" />
                    <span>{fac}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Engagement Metrics */}
            <div className="metric-tiles-row">
              <div className="metric-tile">
                <span className="tile-title">Satisfaction</span>
                <span className="tile-num">{employee.satisfaction_score} / 5</span>
              </div>
              <div className="metric-tile">
                <span className="tile-title">Work-Life Balance</span>
                <span className="tile-num">{employee.work_life_balance} / 5</span>
              </div>
              <div className="metric-tile">
                <span className="tile-title">Overtime</span>
                <span className="tile-num">{employee.overtime}</span>
              </div>
              <div className="metric-tile">
                <span className="tile-title">Performance</span>
                <span className="tile-num">{employee.performance_score} / 5</span>
              </div>
            </div>

            <div className="academic-disclaimer">
              <small>
                <strong>Academic Notice:</strong> Predictions are generated via Scikit-Learn Random Forest Classification model using standardized tenure, compensation, overtime, and satisfaction vectors.
              </small>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .emp-id-pill {
          font-family: var(--font-mono);
          font-weight: 700;
          color: var(--primary);
          background: var(--primary-light);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }
        .detail-layout-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .detail-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .info-val {
          font-size: 0.95rem;
          color: var(--text-main);
        }
        .risk-score-display {
          padding: 20px;
          border-radius: var(--radius-md);
          background-color: var(--bg-surface-alt);
          text-align: center;
          margin-bottom: 20px;
          border: 1px solid var(--border-color);
        }
        .risk-score-display.high {
          background-color: var(--danger-light);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .risk-score-display.medium {
          background-color: var(--warning-light);
          border-color: rgba(245, 158, 11, 0.3);
        }
        .risk-level-tag {
          font-size: 0.825rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .risk-percentage {
          font-size: 2.75rem;
          font-weight: 900;
          line-height: 1.1;
          color: var(--text-main);
          margin: 8px 0;
        }
        .risk-progress-track {
          width: 100%;
          height: 8px;
          border-radius: var(--radius-full);
          background: rgba(0, 0, 0, 0.1);
          overflow: hidden;
          margin-bottom: 10px;
        }
        .risk-progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }
        .risk-helper-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .factors-section {
          margin-bottom: 20px;
        }
        .factors-title {
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .factors-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .factor-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-surface-alt);
          border-radius: var(--radius-sm);
          font-size: 0.825rem;
          color: var(--text-main);
        }
        .metric-tiles-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }
        .metric-tile {
          padding: 10px 14px;
          background: var(--bg-surface-alt);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
        }
        .tile-title {
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .tile-num {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-main);
        }
        .academic-disclaimer {
          padding-top: 14px;
          border-top: 1px solid var(--border-color);
          color: var(--text-dim);
          line-height: 1.4;
        }
        .review-timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 8px;
        }
        .timeline-item {
          display: flex;
          gap: 12px;
          position: relative;
        }
        .timeline-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--primary);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .timeline-content {
          flex: 1;
        }
        .timeline-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .timeline-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .timeline-remarks {
          font-size: 0.825rem;
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}
