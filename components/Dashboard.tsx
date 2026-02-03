
import React from 'react';
import { DataPoint } from '../types';

interface DashboardProps {
  data: DataPoint[];
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const avg = total / data.length;
  const max = Math.max(...data.map(d => d.value));
  const latest = data[data.length - 1]?.value || 0;

  return (
    <div className="space-y-12">
      {/* Glassmorphism KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Volume', value: total, sub: 'Aggregate Metric', color: 'indigo' },
          { label: 'Average Rate', value: avg, sub: 'Historical Mean', color: 'emerald' },
          { label: 'Peak Vector', value: max, sub: 'Max Historical', color: 'rose' },
          { label: 'Latest Close', value: latest, sub: 'Real-time Pulse', color: 'amber' },
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
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Buffer_ID: DATA_SRC</span>
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
              {data.slice().reverse().map((point, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-4 whitespace-nowrap text-xs font-mono text-slate-500">#{data.length - idx}</td>
                  <td className="px-8 py-4 whitespace-nowrap text-xs font-bold text-slate-300">{point.date}</td>
                  <td className="px-8 py-4 whitespace-nowrap text-xs text-right font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">
                    {point.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
