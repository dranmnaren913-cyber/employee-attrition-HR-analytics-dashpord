import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertCircle, Info, BarChart3, PieChart as PieIcon, Layers } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import api from '../services/api';
import { useFilters } from '../context/FilterContext';
import FilterPanel from '../components/common/FilterPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function AttritionAnalytics() {
  const { getQueryString } = useFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = getQueryString();
        const res = await api.get(`/analytics/attrition/${q ? `?${q}` : ''}`);
        setData(res.data);
      } catch (err) {
        console.error("Error loading attrition analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getQueryString]);

  if (loading) return <LoadingSpinner message="Aggregating attrition statistics and factual statements..." />;

  const kpis = data?.kpis || {};
  const insights = data?.insights || [];

  return (
    <div className="attrition-analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attrition Analytics &amp; Flight Signals</h1>
          <p className="page-subtitle">
            Detailed diagnosis of historical turnover patterns, demographic distributions, and retention drivers
          </p>
        </div>
      </div>

      <FilterPanel />

      {/* Factual Insights Callout Box (Section 12 requirement) */}
      {insights.length > 0 && (
        <div className="card insights-card" style={{ marginBottom: '24px' }}>
          <div className="insights-header">
            <Info size={20} className="text-primary" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Factual Analytics Summaries (Selected Scope)</h3>
          </div>
          <div className="insights-list">
            {insights.map((msg, i) => (
              <div key={i} className="insight-item">
                <span className="insight-bullet" />
                <p>{msg}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Charts */}
      <div className="charts-grid">
        {/* Department Attrition */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Department Turnover Comparison</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.attrition_by_department} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="department" angle={-15} textAnchor="end" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="attrition_rate" name="Turnover Rate %" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Satisfaction Level vs Attrition */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Turnover Rate by Satisfaction Rating</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.satisfaction_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="score" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="attrition_rate" name="Turnover %" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Salary Tier Attrition */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Compensation Tier Attrition</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.salary_vs_attrition} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="salary_range" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="attrition_rate" name="Turnover Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Bracket Attrition */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title"><BarChart3 size={18} className="text-primary" /> Age Bracket Turnover</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.attrition_by_age_group} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="age_group" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Bar dataKey="attrition_rate" name="Turnover Rate %" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        .insights-card {
          background-color: var(--primary-light);
          border-color: rgba(37, 99, 235, 0.25);
        }
        .insights-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--primary-text);
        }
        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .insight-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
          color: var(--text-main);
        }
        .insight-bullet {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
