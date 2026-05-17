import React, { useEffect, useMemo, useState } from 'react';
import { Chart } from './components/Chart';
import { DataTable, type Column } from './components/DataTable';
import { StatCard } from './components/StatCard';
import { useDashboardData } from './hooks/useDashboardData';
import type { ChartSeries } from './types';
import {
  formatBucketTime,
  formatNumber,
  formatTimestamp,
  ledLabel
} from './utils/format';

const TABLE_LIMIT = 12;
const HOURS_OPTIONS = [
  { label: '24 h', value: 24 },
  { label: '72 h', value: 72 },
  { label: '128 h', value: 128 },
  { label: 'Todo', value: 0 }
];

export const DashboardPage = () => {
  const [hoursFilter, setHoursFilter] = useState(24);
  const mode = hoursFilter === 0 ? 'all' : 'range';
  const { raw, series, rawSeries, loading, error, intervalMinutes, hours } =
    useDashboardData({ hours: hoursFilter, mode });
  const hoursLabel = hours === 0 ? 'Todo' : `${hours} h`;

  const chartSeries = useMemo<ChartSeries[]>(() => {
    return [
      {
        label: 'Distancia',
        color: '#F4B943',
        values: series.map((item) => item.dist_norm)
      },
      {
        label: 'Velocidad',
        color: '#5BD3C7',
        values: series.map((item) => item.vel_norm)
      },
      {
        label: 'Luz',
        color: '#F173C5',
        values: series.map((item) => item.luz_norm)
      }
    ];
  }, [series]);

  const chartLabels = useMemo(() => {
    return series.map((item) => formatBucketTime(item.bucket));
  }, [series]);

  const rawChartLabels = useMemo(() => {
    return rawSeries.map((item) => formatBucketTime(item.bucket));
  }, [rawSeries]);

  const rawDistanceSeries = useMemo<ChartSeries[]>(() => {
    return [
      {
        label: 'Distancia (cm)',
        color: '#F4B943',
        values: rawSeries.map((item) => item.distancia_cm)
      }
    ];
  }, [rawSeries]);

  const rawSpeedSeries = useMemo<ChartSeries[]>(() => {
    return [
      {
        label: 'Velocidad (cm/s)',
        color: '#5BD3C7',
        values: rawSeries.map((item) => item.velocidad_cms)
      }
    ];
  }, [rawSeries]);

  const rawLightSeries = useMemo<ChartSeries[]>(() => {
    return [
      {
        label: 'Luz (ldr)',
        color: '#F173C5',
        values: rawSeries.map((item) => item.luz)
      }
    ];
  }, [rawSeries]);

  const tableColumns: Column[] = [
    { key: 'bucket', label: 'Hora' },
    { key: 'dist_norm', label: 'Distancia', align: 'right' },
    { key: 'vel_norm', label: 'Velocidad', align: 'right' },
    { key: 'luz_norm', label: 'Luz', align: 'right' }
  ];

  const tableRows = useMemo(() => {
    return series
      .slice(-TABLE_LIMIT)
      .map((item) => ({
        bucket: formatBucketTime(item.bucket),
        dist_norm:
          item.dist_norm === null ? '—' : formatNumber(item.dist_norm, 3),
        vel_norm: item.vel_norm === null ? '—' : formatNumber(item.vel_norm, 3),
        luz_norm: item.luz_norm === null ? '—' : formatNumber(item.luz_norm, 3)
      }));
  }, [series]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.reveal'));

    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="app">
      <main className="dashboard">
        <header className="hero">
          <div>
            <p className="eyebrow">Panel de control</p>
            <h1>Dashboard de sensores</h1>
            <p className="subtitle">
              Lecturas raw en tiempo real y series normalizadas cada minuto.
            </p>
          </div>
          <div className="hero-meta">
            <div>
              <span className="meta-label">Actualizacion</span>
              <span className="meta-value">
                {raw ? formatTimestamp(raw.created_at) : '—'}
              </span>
            </div>
            <div className="meta-pill">
              Intervalo {intervalMinutes} min · {hoursLabel}
            </div>
            <label className="meta-select">
              <span className="meta-label">Rango</span>
              <select
                value={hoursFilter}
                onChange={(event) => setHoursFilter(Number(event.target.value))}
              >
                {HOURS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {error ? <div className="error">{error}</div> : null}

        <section className="cards reveal">
          <StatCard
            label="Distancia"
            value={raw ? formatNumber(raw.distancia_cm, 2) : '—'}
            unit="cm"
            tone="accent"
          />
          <StatCard
            label="Velocidad"
            value={raw ? formatNumber(raw.velocidad_cms, 2) : '—'}
            unit="cm/s"
            tone="cool"
          />
          <StatCard
            label="Luz"
            value={raw ? String(raw.luz) : '—'}
            unit="ldr"
            tone="warm"
          />
          <StatCard label="Semaforo" value={raw ? raw.semaforo : '—'} />
          <StatCard label="Alarma" value={raw ? raw.alarma : '—'} />
          <StatCard
            label="Led activo"
            value={raw ? ledLabel(raw.led_activo) : '—'}
          />
        </section>

        <section className="panel reveal">
          <div className="panel-header">
            <div>
              <h2>Serie normalizada (0-1)</h2>
              <p>Promedios cada minuto durante {hoursLabel.toLowerCase()}.</p>
            </div>
            <div className="legend">
              {chartSeries.map((item) => (
                <span key={item.label} style={{ color: item.color }}>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="loading">Cargando datos...</div>
          ) : (
            <Chart
              series={chartSeries}
              labels={chartLabels}
              domain={{ min: 0, max: 1 }}
            />
          )}
        </section>

        <section className="panel reveal">
          <div className="panel-header">
            <div>
              <h2>Serie raw</h2>
              <p>Promedios por minuto con valores reales del sensor.</p>
            </div>
          </div>
          {loading ? (
            <div className="loading">Cargando datos...</div>
          ) : (
            <div className="panel-grid">
              <div className="mini-panel">
                <div className="mini-title">Distancia (cm)</div>
                <Chart series={rawDistanceSeries} labels={rawChartLabels} />
              </div>
              <div className="mini-panel">
                <div className="mini-title">Velocidad (cm/s)</div>
                <Chart series={rawSpeedSeries} labels={rawChartLabels} />
              </div>
              <div className="mini-panel">
                <div className="mini-title">Luz (ldr)</div>
                <Chart series={rawLightSeries} labels={rawChartLabels} />
              </div>
            </div>
          )}
        </section>

        <DataTable
          title="Detalle por minuto"
          columns={tableColumns}
          rows={tableRows}
        />
      </main>
    </div>
  );
};
