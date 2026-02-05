
export interface DataPoint {
  date: string;
  value: number;
}

export interface ForecastPoint extends DataPoint {
  NeuralProphet?: number;
  Prophet?: number;
  SARIMAX?: number;
  HoltWinters?: number;
}

export interface ModelMetric {
  name: string;
  sMAPE: number;
  inSampleError: number;
  computationTime: number; // in seconds
  description: string;
}

export interface DetailedInsights {
  rationale: string;
  dataCharacteristics: string;
  risks: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ForecastResponse {
  forecasts: ForecastPoint[];
  metrics: ModelMetric[];
  winner: string;
  insights: string; // Brief summary
  detailedInsights: DetailedInsights;
}

export interface AppState {
  historicalData: DataPoint[];
  forecastResult: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  sources: GroundingSource[];
}
