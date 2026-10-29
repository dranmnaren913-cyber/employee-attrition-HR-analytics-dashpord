import React from 'react';

export default function KPICard({ label, value, subtext, icon: Icon, variant = 'primary', badgeText }) {
  return (
    <div className={`kpi-card ${variant}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-subtext">
        {badgeText && <span className={`badge badge-${variant}`}>{badgeText}</span>}
        <span>{subtext}</span>
      </div>
    </div>
  );
}
