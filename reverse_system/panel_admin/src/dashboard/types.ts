export type RawData = {
  id: number;
  distancia_cm: number;
  velocidad_cms: number;
  luz: number;
  semaforo: string;
  alarma: string;
  led_activo: number;
  created_at: string;
};

export type SeriesPoint = {
  bucket: string;
  dist_norm: number | null;
  vel_norm: number | null;
  luz_norm: number | null;
};

export type RawSeriesPoint = {
  bucket: string;
  distancia_cm: number | null;
  velocidad_cms: number | null;
  luz: number | null;
};

export type ChartSeries = {
  label: string;
  color: string;
  values: Array<number | null>;
};
