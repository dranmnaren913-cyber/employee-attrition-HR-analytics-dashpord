import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, FileText, FileCode, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Reports() {
  const { appliedFilters, activeFilterCount } = useFilters();
  const [reportType, setReportType] = useState('attrition_summary');
  const [format, setFormat] = useState('PDF');
  const [generating, setGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/reports/logs/');
      setLogs(res.data);
    } catch (err) {
      console.error("Error loading report logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const response = await api.post(
        '/reports/generate/',
        {
          report_type: reportType,
          format: format,
          filters: appliedFilters
        },
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'PDF'
          ? 'application/pdf'
          : (format === 'CSV' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'PDF' ? 'pdf' : (format === 'CSV' ? 'csv' : 'xlsx');
      link.setAttribute('download', `${reportType}_report_${new Date().getTime()}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      fetchLogs();
    } catch (err) {
      alert("Failed to generate report: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const reportOptions = [
    { id: 'attrition_summary', label: 'Attrition Summary Report', desc: 'Overview of department turnover, flight signals, and retention metrics' },
    { id: 'high_risk_report', label: 'High-Risk Attrition Alert Report', desc: 'Identified employees with elevated flight probability (>65%)' },
    { id: 'department_report', label: 'Department Analytics & Headcount', desc: 'Departmental staff numbers, salary distribution, and roles' },
    { id: 'salary_report', label: 'Salary & Compensation Report', desc: 'Wage percentiles, min/max/average compensation, and experience curves' },
    { id: 'performance_report', label: 'Performance Evaluation Report', desc: 'Appraisal score distribution and department ratings' },
    { id: 'satisfaction_report', label: 'Employee Satisfaction & Morale', desc: 'Workplace satisfaction ratings, sentiment, and work-life balance' },
    { id: 'employee_summary', label: 'Comprehensive Employee Directory', desc: 'Complete workforce roster with personal and organizational data' },
  ];

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive HR Reports &amp; Exports</h1>
          <p className="page-subtitle">
            Generate formal PDF dossiers, Excel workbooks, and CSV summaries aligned with active filters
          </p>
        </div>
      </div>

      <FilterPanel />

      <div className="reports-layout-grid">
        {/* Generator Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FileSpreadsheet size={18} className="text-primary" />
              Generate Customized Report
            </h3>
            {activeFilterCount > 0 && (
              <span className="badge badge-primary">{activeFilterCount} Active Filters Applied</span>
            )}
          </div>

          <form onSubmit={handleGenerateReport}>
            <div className="form-group">
              <label className="form-label">Select Report Subject</label>
              <div className="report-types-list">
                {reportOptions.map(opt => (
                  <label
                    key={opt.id}
                    className={`report-option-label ${reportType === opt.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="reportType"
                      value={opt.id}
                      checked={reportType === opt.id}
                      onChange={() => setReportType(opt.id)}
                    />
                    <div>
                      <strong>{opt.label}</strong>
                      <p>{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Output Document Format</label>
              <div className="format-selector">
                <button
                  type="button"
                  onClick={() => setFormat('PDF')}
                  className={`format-btn ${format === 'PDF' ? 'active' : ''}`}
                >
                  <FileText size={18} />
                  <span>PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('EXCEL')}
                  className={`format-btn ${format === 'EXCEL' ? 'active' : ''}`}
                >
                  <FileSpreadsheet size={18} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('CSV')}
                  className={`format-btn ${format === 'CSV' ? 'active' : ''}`}
                >
                  <FileCode size={18} />
                  <span>CSV File</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px', padding: '12px' }}
            >
              <Download size={18} />
              {generating ? 'Compiling Report Document...' : `Download ${format} Report`}
            </button>
          </form>
        </div>

        {/* Report Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Clock size={18} className="text-primary" />
              Generated Report History
            </h3>
          </div>

          {loadingLogs ? (
            <LoadingSpinner message="Loading historical report logs..." />
          ) : logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No generated reports logged yet.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Report Title</th>
                    <th>Format</th>
                    <th>Generated By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><strong>{log.title}</strong></td>
                      <td>
                        <span className={`badge ${
                          log.format === 'PDF' ? 'badge-danger' :
                          log.format === 'EXCEL' ? 'badge-success' : 'badge-primary'
                        }`}>
                          {log.format}
                        </span>
                      </td>
                      <td>{log.generated_by}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleString()}
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
        .reports-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .reports-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        .report-types-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .report-option-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-surface-alt);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .report-option-label:hover {
          border-color: var(--primary);
        }
        .report-option-label.selected {
          border-color: var(--primary);
          background-color: var(--primary-light);
        }
        .report-option-label input {
          margin-top: 4px;
        }
        .report-option-label strong {
          display: block;
          font-size: 0.875rem;
          color: var(--text-main);
        }
        .report-option-label p {
          font-size: 0.775rem;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .format-selector {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .format-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-surface-alt);
          color: var(--text-main);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .format-btn:hover {
          border-color: var(--primary);
        }
        .format-btn.active {
          border-color: var(--primary);
          background: var(--primary-light);
          color: var(--primary-text);
        }
      `}</style>
    </div>
  );
}
