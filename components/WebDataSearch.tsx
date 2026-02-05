
import React, { useState } from 'react';
import { forecastService } from '../services/geminiService';
import { DataPoint, GroundingSource } from '../types';

interface WebDataSearchProps {
  onDataLoaded: (data: DataPoint[], sources: GroundingSource[]) => void;
  isLoading: boolean;
}

const WebDataSearch: React.FC<WebDataSearchProps> = ({ onDataLoaded, isLoading }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setStatus("Navigating Web Vectors...");
    try {
      const { data, sources } = await forecastService.fetchWebTimeSeriesData(query);
      if (data.length === 0) throw new Error("No usable time-series data found for this query.");
      onDataLoaded(data, sources);
      setStatus(null);
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="glass p-8 rounded-[2.5rem] border-indigo-500/20 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
      
      <div className="flex items-center space-x-4 mb-6">
        <div className="bg-indigo-600/20 p-2.5 rounded-xl text-indigo-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Search & Analyze the Web</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Direct ingest from public domain sources</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Google stock price last 2 years"
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
        />
        <button
          disabled={isLoading || !query.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 whitespace-nowrap active:scale-95"
        >
          {isLoading ? 'Processing...' : 'Analyze Web'}
        </button>
      </form>
      
      {status && (
        <div className={`mt-4 text-[10px] font-black uppercase tracking-widest ${status.startsWith('Error') ? 'text-rose-400' : 'text-indigo-400 animate-pulse'}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default WebDataSearch;
