
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DataPoint, ForecastPoint } from '../types';

interface ForecastChartProps {
  historical: DataPoint[];
  forecasts: ForecastPoint[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ historical, forecasts }) => {
  const lastHistorical = historical.slice(-60);
  
  const chartData = [
    ...lastHistorical.map(d => ({ ...d, type: 'actual' })),
    ...forecasts.map(f => ({ ...f, type: 'forecast' }))
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-4 rounded-2xl border border-white/10 shadow-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between space-x-8">
                <span className="text-xs font-bold" style={{ color: entry.color }}>{entry.name}</span>
                <span className="text-xs font-black text-white">{entry.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[550px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
            axisLine={false}
            tickLine={false}
            orientation="right"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} 
          />
          
          <Line 
            name="Actual Trend"
            type="monotone" 
            dataKey="value" 
            stroke="#ffffff" 
            strokeWidth={4} 
            dot={false}
            activeDot={{ r: 6, fill: '#ffffff', strokeWidth: 0 }}
          />
          <Line 
            name="NeuralProphet"
            type="monotone" 
            dataKey="NeuralProphet" 
            stroke="#6366f1" 
            strokeWidth={3} 
            dot={false}
            filter="url(#glow)"
          />
          <Line 
            name="FB Prophet"
            type="monotone" 
            dataKey="Prophet" 
            stroke="#ec4899" 
            strokeWidth={3} 
            dot={false}
            filter="url(#glow)"
          />
          <Line 
            name="SARIMAX"
            type="monotone" 
            dataKey="SARIMAX" 
            stroke="#0ea5e9" 
            strokeWidth={3} 
            dot={false}
            filter="url(#glow)"
          />
          <Line 
            name="Holt-Winters"
            type="monotone" 
            dataKey="HoltWinters" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={false}
            filter="url(#glow)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
