import { useEffect, useState } from 'react';
import type { RawData, RawSeriesPoint, SeriesPoint } from '../types';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3006';
const DEFAULT_INTERVAL_MINUTES = 1;
const DEFAULT_HOURS = 24;

type DashboardOptions = {
  intervalMinutes?: number;
  hours?: number;
  mode?: 'range' | 'all';
};

export const useDashboardData = (options: DashboardOptions = {}) => {
  const intervalMinutes = options.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES;
  const hours = options.hours ?? DEFAULT_HOURS;
  const mode = options.mode ?? 'range';
  const [raw, setRaw] = useState<RawData | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [rawSeries, setRawSeries] = useState<RawSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const [rawRes, seriesRes, rawSeriesRes] = await Promise.all([
          fetch(`${API_BASE}/api/data/latest`),
          fetch(
            `${API_BASE}/api/normalized/series?intervalMinutes=${intervalMinutes}&hours=${hours}&mode=${mode}`
          ),
          fetch(
            `${API_BASE}/api/data/series?intervalMinutes=${intervalMinutes}&hours=${hours}&mode=${mode}`
          )
        ]);

        if (!rawRes.ok) {
          throw new Error('No se pudo cargar el ultimo dato raw');
        }
        if (!seriesRes.ok) {
          throw new Error('No se pudo cargar la serie normalizada');
        }
        if (!rawSeriesRes.ok) {
          throw new Error('No se pudo cargar la serie raw');
        }

        const rawJson = (await rawRes.json()) as RawData;
        const seriesJson = (await seriesRes.json()) as SeriesPoint[];
        const rawSeriesJson = (await rawSeriesRes.json()) as RawSeriesPoint[];

        if (cancelled) return;

        setRaw({
          ...rawJson,
          distancia_cm: Number(rawJson.distancia_cm),
          velocidad_cms: Number(rawJson.velocidad_cms),
          luz: Number(rawJson.luz),
          led_activo: Number(rawJson.led_activo)
        });

        setSeries(
          seriesJson.map((item) => ({
            bucket: item.bucket,
            dist_norm: item.dist_norm === null ? null : Number(item.dist_norm),
            vel_norm: item.vel_norm === null ? null : Number(item.vel_norm),
            luz_norm: item.luz_norm === null ? null : Number(item.luz_norm)
          }))
        );

        setRawSeries(
          rawSeriesJson.map((item) => ({
            bucket: item.bucket,
            distancia_cm:
              item.distancia_cm === null ? null : Number(item.distancia_cm),
            velocidad_cms:
              item.velocidad_cms === null ? null : Number(item.velocidad_cms),
            luz: item.luz === null ? null : Number(item.luz)
          }))
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();
    const interval = window.setInterval(loadData, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hours, intervalMinutes, mode]);

  return {
    raw,
    series,
    rawSeries,
    loading,
    error,
    intervalMinutes,
    hours
  };
};
