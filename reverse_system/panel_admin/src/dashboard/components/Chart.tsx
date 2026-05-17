import React, { useMemo, useRef, useState } from 'react';
import type { ChartSeries } from '../types';

type ChartProps = {
  series: ChartSeries[];
  labels: string[];
  domain?: {
    min: number;
    max: number;
  };
};

type ChartPoint = {
  x: number;
  y: number;
};

const buildPoints = (
  values: Array<number | null>,
  width: number,
  height: number,
  min: number,
  max: number
) => {
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points: ChartPoint[] = [];

  values.forEach((value, index) => {
    if (value === null || Number.isNaN(value)) {
      return;
    }

    const x = index * stepX;
    const ratio = (value - min) / (max - min || 1);
    const y = height - ratio * height;

    points.push({ x, y });
  });

  return points;
};

const buildPath = (points: ChartPoint[]) => {
  if (points.length === 0) return '';
  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(' ');
};

export const Chart = ({ series, labels, domain }: ChartProps) => {
  const width = 880;
  const height = 240;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lastHoverIndex, setLastHoverIndex] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const showLabels = labels.length > 0;
  const labelStep = Math.ceil(labels.length / 6);
  const values = series
    .flatMap((item) => item.values)
    .filter((value) => value !== null) as number[];
  const minValue = domain?.min ?? (values.length ? Math.min(...values) : 0);
  const maxValue = domain?.max ?? (values.length ? Math.max(...values) : 1);
  const pointCount = useMemo(() => {
    const lengths = series.map((item) => item.values.length);
    return Math.max(labels.length, ...lengths, 0);
  }, [labels.length, series]);
  const stepX = pointCount > 1 ? width / (pointCount - 1) : 0;
  const activeHoverIndex = hoverIndex ?? lastHoverIndex;
  const hoverLabel = activeHoverIndex === null ? '' : labels[activeHoverIndex] ?? '';

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pointCount === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const ratio = rect.width === 0 ? 0 : relativeX / rect.width;
    const positionX = ratio * width;
    const index = Math.round(ratio * (pointCount - 1));
    setHoverX(positionX);
    setHoverIndex(index);
    setLastHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const formatValue = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return '—';
    return value.toFixed(3);
  };

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Serie de sensores normalizada"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="chart-grid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#chart-grid)" />
        {[0.25, 0.5, 0.75].map((value) => (
          <line
            key={value}
            x1="0"
            x2={width}
            y1={height * value}
            y2={height * value}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 8"
          />
        ))}
        {series.map((item) => {
          const points = buildPoints(item.values, width, height, minValue, maxValue);
          const path = buildPath(points);

          return (
            <g key={item.label}>
              {path ? (
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {points.length === 1 ? (
                <circle
                  cx={points[0].x}
                  cy={points[0].y}
                  r="5"
                  fill={item.color}
                />
              ) : null}
            </g>
          );
        })}
        {hoverIndex !== null ? (
          <line
            className="chart-cursor"
            x1={hoverX}
            x2={hoverX}
            y1={0}
            y2={height}
            stroke="rgba(255,255,255,0.24)"
            strokeDasharray="4 6"
          />
        ) : null}
        {hoverIndex !== null
          ? series.map((item) => {
              const value = item.values[hoverIndex] ?? null;
              if (value === null || Number.isNaN(value)) return null;
              const ratio = (value - minValue) / (maxValue - minValue || 1);
              const y = height - ratio * height;
              return (
                <circle
                  key={`${item.label}-hover`}
                  cx={hoverX}
                  cy={y}
                  r="5"
                  fill={item.color}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="2"
                />
              );
            })
          : null}
      </svg>
      {activeHoverIndex !== null ? (
        <div
          className={`chart-tooltip${hoverIndex !== null ? ' is-active' : ''}`}
          style={{ left: `${(hoverX / width) * 100}%` }}
        >
          <div className="chart-tooltip-title">{hoverLabel || '—'}</div>
          {series.map((item) => (
            <div className="chart-tooltip-row" key={`${item.label}-tip`}>
              <span className="chart-tooltip-label" style={{ color: item.color }}>
                {item.label}
              </span>
              <span className="chart-tooltip-value">
                {formatValue(item.values[activeHoverIndex] ?? null)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {showLabels ? (
        <div className="chart-labels">
          {labels.map((label, index) =>
            index % labelStep === 0 ? (
              <span key={`${label}-${index}`}>{label}</span>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  );
};
