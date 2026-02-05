
import { GoogleGenAI, Type } from "@google/genai";
import { DataPoint, ForecastResponse, GroundingSource } from "../types";

export class ForecastingService {
  constructor() {}

  async fetchWebTimeSeriesData(query: string): Promise<{ data: DataPoint[], sources: GroundingSource[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [{
            text: `
              Search the web for historical time-series data related to: "${query}".
              
              Target: Find at least 30-180 recent data points (dates and values). 
              If the query is for stock prices, search for historical closing prices.
              If it's for trends, find numerical index values.
              
              Format the output strictly as a JSON object:
              {
                "data": [
                  {"date": "YYYY-MM-DD", "value": 123.45},
                  ...
                ]
              }
              
              Return ONLY valid JSON. Ensure dates are chronological.
            `
          }]
        },
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              data: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    value: { type: Type.NUMBER }
                  },
                  required: ["date", "value"]
                }
              }
            },
            required: ["data"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No data found on the web for this query.");
      
      const result = JSON.parse(text);
      
      // Extract grounding sources
      const sources: GroundingSource[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || "Reference Source",
              uri: chunk.web.uri
            });
          }
        });
      }

      return { data: result.data, sources };
    } catch (error: any) {
      console.error("Web Data Fetch Error:", error);
      if (error?.message?.includes('429')) throw new Error("Rate limit exceeded. Try again in a minute.");
      throw new Error("Failed to extract web data. Try a more specific query like 'MSFT stock price daily 2024'.");
    }
  }

  async extractDataFromPdf(base64Data: string): Promise<{ headers: string[], rows: string[][] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            },
            {
              text: `
                Identify and extract the most relevant time-series table from this document. 
                Specifically look for historical sales, price lists, trend reports, or any chronological data.
                
                Return the data in a JSON object with:
                1. "headers": An array of column names.
                2. "rows": A 2D array where each inner array represents a row of string values.
                
                Return ONLY valid JSON.
              `
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headers: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            required: ["headers", "rows"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Multimodal engine failed to extract document data.");

      const result = JSON.parse(text);
      return result;
    } catch (error: any) {
      console.error("PDF Extraction Error:", error);
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota')) {
        throw new Error("AI Rate limit reached. Please wait a moment before trying again.");
      }
      throw new Error("The AI engine could not find or extract a valid table from this PDF. Ensure the document contains a clear data table.");
    }
  }

  async runForecastingContest(data: DataPoint[]): Promise<ForecastResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const dataString = JSON.stringify(data.slice(-180));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [{
            text: `
              Analyze the following time-series data and run a forecasting contest for the next 30 days.
              Data: ${dataString}

              You must simulate the output of 4 distinct models:
              1. NeuralProphet (Deep Learning based trend and seasonality)
              2. Facebook Prophet (Additive model)
              3. SARIMAX (Seasonal Autoregressive Integrated Moving Average)
              4. Holt-Winters (Triple Exponential Smoothing)

              Detailed Requirements for Insights:
              - Explain WHY the winner was chosen.
              - Describe the observed data characteristics (seasonality, trend, and noise).
              - List potential risks or caveats to this specific forecast.

              IMPORTANT: Return ONLY valid JSON. Do not include conversational text.
            `
          }]
        },
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
                  rationale: { type: Type.STRING },
                  dataCharacteristics: { type: Type.STRING },
                  risks: { type: Type.STRING }
                },
                required: ["rationale", "dataCharacteristics", "risks"]
              }
            },
            required: ["forecasts", "metrics", "winner", "insights", "detailedInsights"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI engine.");

      const jsonMatch = text.match(/```json\s?([\s\S]*?)\s?```/) || text.match(/{[\s\S]*}/);
      const cleanedText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

      const result = JSON.parse(cleanedText);
      return result as ForecastResponse;
    } catch (error: any) {
      console.error("Forecasting Engine Critical Error:", error);
      if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('quota')) {
        throw new Error("Forecasting engine rate limit reached. Please wait a few seconds before the next sync.");
      }
      throw error;
    }
  }
}

export const forecastService = new ForecastingService();
