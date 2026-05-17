import React from 'react';

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  tone?: 'accent' | 'warm' | 'cool';
};

export const StatCard = ({ label, value, unit, tone }: StatCardProps) => {
  return (
    <div className={`stat-card ${tone || ''}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">
        <span>{value}</span>
        {unit ? <span className="stat-unit">{unit}</span> : null}
      </div>
    </div>
  );
};
