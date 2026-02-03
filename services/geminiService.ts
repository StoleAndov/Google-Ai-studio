
import { GoogleGenAI, Type } from "@google/genai";
import { DataPoint, ForecastResponse } from "../types";

export class ForecastingService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async runForecastingContest(data: DataPoint[]): Promise<ForecastResponse> {
    const dataString = JSON.stringify(data.slice(-180)); // Use last 6 months for context

    const response = await this.ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
        Analyze the following time-series data and run a forecasting contest for the next 30 days.
        Data: ${dataString}

        You must simulate the output of 4 distinct models:
        1. NeuralProphet (Deep Learning based trend and seasonality)
        2. Facebook Prophet (Additive model)
        3. SARIMAX (Seasonal Autoregressive Integrated Moving Average)
        4. Holt-Winters (Triple Exponential Smoothing)

        Detailed Requirements for Insights:
        - Explain WHY the winner was chosen (e.g., better handling of non-linear trends, robustness to noise).
        - Describe the observed data characteristics (seasonality, stationarity, volatility).
        - List potential risks or caveats to this specific forecast.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            forecasts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  NeuralProphet: { type: Type.NUMBER },
                  Prophet: { type: Type.NUMBER },
                  SARIMAX: { type: Type.NUMBER },
                  HoltWinters: { type: Type.NUMBER }
                },
                required: ["date", "NeuralProphet", "Prophet", "SARIMAX", "HoltWinters"]
              }
            },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  sMAPE: { type: Type.NUMBER },
                  inSampleError: { type: Type.NUMBER },
                  computationTime: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["name", "sMAPE", "inSampleError", "computationTime"]
              }
            },
            winner: { type: Type.STRING },
            insights: { type: Type.STRING },
            detailedInsights: {
              type: Type.OBJECT,
              properties: {
                rationale: { type: Type.STRING, description: "Why the winning model outperformed the others for this specific data pattern." },
                dataCharacteristics: { type: Type.STRING, description: "A summary of seasonality, trend, and noise observed in the input." },
                risks: { type: Type.STRING, description: "Uncertainties or external factors that could skew this 30-day projection." }
              },
              required: ["rationale", "dataCharacteristics", "risks"]
            }
          },
          required: ["forecasts", "metrics", "winner", "insights", "detailedInsights"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as ForecastResponse;
  }
}

export const forecastService = new ForecastingService();
