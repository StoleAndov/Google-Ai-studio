
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, Area, ComposedChart } from 'recharts';
import { DataPoint, ForecastPoint } from '../types';

interface ForecastChartProps {
  historical: DataPoint[];
  forecasts: ForecastPoint[];
}

const COLORS = {
  actual: '#6366f1',
  neural: '#39ff14', // Neon Green
  prophet: '#ff00ff', // Neon Magenta
  sarimax: '#00ffff', // Neon Cyan
  holt: '#ffff00'    // Neon Yellow
};

const ForecastChart: React.FC<ForecastChartProps> = ({ historical, forecasts }) => {
  const lastHistorical = historical.slice(-90);
  
  const chartData = [
    ...lastHistorical.map(d => ({ ...d, type: 'actual' })),
    ...forecasts.map(f => ({ ...f, type: 'forecast' }))
  ];

  const lastHistoryDate = lastHistorical[lastHistorical.length - 1]?.date;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecast = payload.some((p: any) => p.payload.type === 'forecast');
      return (
        <div className="glass p-3 md:p-5 rounded-2xl border border-white/10 shadow-2xl min-w-[160px] md:min-w-[220px]">
          <div className="flex justify-between items-center mb-2 md:mb-4 border-b border-white/5 pb-1 md:pb-2">
             <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</p>
             <span className={`text-[7px] md:text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase ${isForecast ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'}`}>
               {isForecast ? 'Future' : 'Past'}
             </span>
          </div>
          <div className="space-y-2 md:space-y-3">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 5px ${entry.color}` }}></div>
                  <span className="text-[9px] md:text-[11px] font-bold text-slate-300 uppercase">{entry.name}</span>
                </div>
                <span className="text-[9px] md:text-xs font-black text-white">{entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-end gap-x-3 md:gap-x-6 gap-y-1 md:gap-y-2 mb-4 md:mb-8">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center space-x-1.5 md:space-x-2">
            <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}></div>
            <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-full h-[350px] sm:h-[450px] md:h-[550px] landscape-chart-h mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.actual} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={COLORS.actual} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 8, fill: '#475569', fontWeight: 800 }} 
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis 
            tick={{ fontSize: 9, fill: '#475569', fontWeight: 800 }} 
            axisLine={false}
            tickLine={false}
            orientation="right"
            dx={8}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.03)', strokeWidth: 30 }} isAnimationActive={false} />
          <Legend content={renderCustomLegend} verticalAlign="top" align="right" />
          {lastHistoryDate && <ReferenceArea x1={chartData[0].date} x2={lastHistoryDate} fill="rgba(255,255,255,0.01)" />}
          <Area type="monotone" dataKey="value" fill="url(#actualGradient)" stroke="none" activeDot={false} />
          <Line name="History" type="monotone" dataKey="value" stroke={COLORS.actual} strokeWidth={3} dot={false} filter="url(#glow)" activeDot={{ r: 4, fill: COLORS.actual, stroke: '#fff', strokeWidth: 1.5 }} />
          <Line name="Neural" type="monotone" dataKey="NeuralProphet" stroke={COLORS.neural} strokeWidth={2.5} dot={false} strokeDasharray="2 2" connectNulls filter="url(#glow)" />
          <Line name="Prophet" type="monotone" dataKey="Prophet" stroke={COLORS.prophet} strokeWidth={2.5} dot={false} connectNulls filter="url(#glow)" />
          <Line name="SARIMAX" type="monotone" dataKey="SARIMAX" stroke={COLORS.sarimax} strokeWidth={2.5} dot={false} strokeDasharray="4 4" connectNulls filter="url(#glow)" />
          <Line name="Holt" type="monotone" dataKey="HoltWinters" stroke={COLORS.holt} strokeWidth={2.5} dot={false} connectNulls filter="url(#glow)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
