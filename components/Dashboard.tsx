
import React, { useState, useMemo } from 'react';
import { DataPoint } from '../types';

interface DashboardProps {
  data: DataPoint[];
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  // Filter States
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [minVal, setMinVal] = useState<string>('');
  const [maxVal, setMaxVal] = useState<string>('');

  // Derived filtered data
  const filteredData = useMemo(() => {
    return data.filter(point => {
      const d = new Date(point.date);
      const start = dateStart ? new Date(dateStart) : null;
      const end = dateEnd ? new Date(dateEnd) : null;
      const val = point.value;
      const min = minVal !== '' ? parseFloat(minVal) : null;
      const max = maxVal !== '' ? parseFloat(maxVal) : null;

      if (start && d < start) return false;
      if (end && d > end) return false;
      if (min !== null && val < min) return false;
      if (max !== null && val > max) return false;
      return true;
    });
  }, [data, dateStart, dateEnd, minVal, maxVal]);

  // Recalculate KPIs based on filtered set
  const metrics = useMemo(() => {
    if (filteredData.length === 0) return { total: 0, avg: 0, max: 0, latest: 0 };
    const total = filteredData.reduce((acc, curr) => acc + curr.value, 0);
    const avg = total / filteredData.length;
    const max = Math.max(...filteredData.map(d => d.value));
    const latest = filteredData[filteredData.length - 1]?.value || 0;
    return { total, avg, max, latest };
  }, [filteredData]);

  const resetFilters = () => {
    setDateStart('');
    setDateEnd('');
    setMinVal('');
    setMaxVal('');
  };

  return (
    <div className="space-y-12">
      {/* Vector Calibration (Filters) */}
      <div className="glass p-8 rounded-[2.5rem] border-indigo-500/10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600/20 p-3 rounded-2xl">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Vector Calibration</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                Displaying {filteredData.length} of {data.length} active nodes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 xl:ml-12">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Start Date</label>
              <input 
                type="date" 
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">End Date</label>
              <input 
                type="date" 
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Min Magnitude</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={minVal}
                onChange={(e) => setMinVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Max Magnitude</label>
              <input 
                type="number" 
                placeholder="∞"
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            onClick={resetFilters}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all"
          >
            Reset Vector
          </button>
        </div>
      </div>

      {/* Glassmorphism KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Volume', value: metrics.total, sub: 'Filtered Sum', color: 'indigo' },
          { label: 'Average Rate', value: metrics.avg, sub: 'Selected Mean', color: 'emerald' },
          { label: 'Peak Vector', value: metrics.max, sub: 'Window Peak', color: 'rose' },
          { label: 'Latest Close', value: metrics.latest, sub: 'Current Pulse', color: 'amber' },
        ].map((kpi, i) => (
          <div key={i} className="glass p-8 rounded-3xl relative overflow-hidden group hover:bg-white/5 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500/5 blur-2xl rounded-full -mr-12 -mt-12`}></div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">{kpi.label}</p>
            <h3 className="text-4xl font-black text-white tracking-tight">
              {kpi.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </h3>
            <div className="flex items-center mt-4 space-x-2">
              <span className={`text-[10px] font-bold text-${kpi.color}-400 uppercase`}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Raw Data Table - Dark Mode */}
      <div className="glass rounded-[2rem] overflow-hidden">
        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-black text-white uppercase tracking-widest text-sm">Exploratory Vector Stream</h3>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Filtered_Set: {filteredData.length}_Nodes</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-[#0B0B0E] sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Index</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Metric Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.length > 0 ? (
                filteredData.slice().reverse().map((point, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4 whitespace-nowrap text-xs font-mono text-slate-500">#{filteredData.length - idx}</td>
                    <td className="px-8 py-4 whitespace-nowrap text-xs font-bold text-slate-300">{point.date}</td>
                    <td className="px-8 py-4 whitespace-nowrap text-xs text-right font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">
                      {point.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center">
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No vector data matches active constraints.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
