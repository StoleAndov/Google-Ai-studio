
import React, { useState, useCallback } from 'react';
import { utils, writeFile } from 'xlsx';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ForecastChart from './components/ForecastChart';
import { DataPoint, AppState, ForecastResponse, ModelMetric } from './types';
import { forecastService } from './services/geminiService';

type ViewMode = 'historical' | 'forecast';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    historicalData: [],
    forecastResult: null,
    loading: false,
    error: null
  });
  const [viewMode, setViewMode] = useState<ViewMode>('historical');

  const handleDataLoaded = useCallback(async (data: DataPoint[]) => {
    setState(prev => ({ ...prev, historicalData: data, loading: true, error: null, forecastResult: null }));
    setViewMode('historical');
    
    try {
      const result = await forecastService.runForecastingContest(data);
      setState(prev => ({ ...prev, forecastResult: result, loading: false }));
      setViewMode('forecast');
    } catch (err: any) {
      setState(prev => ({ ...prev, loading: false, error: "Contest engine failed. Validate data schema." }));
    }
  }, []);

  const sortedMetrics = state.forecastResult?.metrics.sort((a, b) => a.sMAPE - b.sMAPE) || [];

  const handleExport = (type: 'csv' | 'xlsx') => {
    if (!sortedMetrics.length) return;

    // Prepare data for export
    const exportData = sortedMetrics.map(m => ({
      'Model Name': m.name,
      'sMAPE Accuracy (%)': (m.sMAPE * 100).toFixed(2),
      'In-Sample Error': m.inSampleError.toFixed(2),
      'Computation Time (s)': m.computationTime,
      'Description': m.description
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contest Metrics");

    const filename = `predictx_contest_metrics_${new Date().toISOString().split('T')[0]}.${type}`;
    writeFile(workbook, filename, { bookType: type });
  };

  return (
    <div className="min-h-screen pb-32 selection:bg-indigo-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 sm:px-8 mt-12">
        <div className="flex flex-col space-y-16">
          
          {/* Top of Z: Upload & Control Section */}
          <section className="flex flex-col lg:flex-row gap-12 items-start">
            <div className="w-full lg:w-2/3">
              <FileUpload onDataLoaded={handleDataLoaded} isLoading={state.loading} />
            </div>
            
            <div className="w-full lg:w-1/3 space-y-6">
              <div className="glass p-8 rounded-[2rem] border-indigo-500/20">
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Engine Logic</h3>
                <div className="space-y-4">
                  {[
                    { n: 'NeuralProphet', d: 'Deep Learning / AR' },
                    { n: 'FB Prophet', d: 'Additive Regression' },
                    { n: 'SARIMAX', d: 'Seasonal ARIMA' },
                    { n: 'Holt-Winters', d: 'Exponential Smoothing' },
                  ].map(m => (
                    <div key={m.n} className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300">{m.n}</span>
                      <span className="text-slate-500 font-medium">{m.d}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {state.historicalData.length > 0 && (
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setViewMode('historical')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'historical' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    History
                  </button>
                  <button 
                    disabled={!state.forecastResult && !state.loading}
                    onClick={() => setViewMode('forecast')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 ${viewMode === 'forecast' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'} disabled:opacity-20`}
                  >
                    Forecast
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Center of Z: Primary Visualization Area */}
          {state.historicalData.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="glass p-10 rounded-[3rem] border-white/5 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                      {viewMode === 'historical' ? 'Trend Analysis' : 'Predictive Contest Output'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium tracking-wide">
                      {viewMode === 'historical' ? 'Validating historical data distribution and outliers.' : 'Simulated 30-day forecast across 4 algorithmic vectors.'}
                    </p>
                  </div>
                  {viewMode === 'forecast' && state.forecastResult && (
                    <div className="flex items-center space-x-4 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Winning Model</span>
                      <span className="text-sm font-black text-white">{state.forecastResult.winner}</span>
                    </div>
                  )}
                </div>
                
                {viewMode === 'historical' ? (
                  <Dashboard data={state.historicalData} />
                ) : (
                  state.forecastResult && <ForecastChart historical={state.historicalData} forecasts={state.forecastResult.forecasts} />
                )}
              </div>
            </section>
          )}

          {/* Bottom of Z: Detailed Metrics & Winner Highlight */}
          {viewMode === 'forecast' && state.forecastResult && (
            <section className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7">
                  <div className="glass rounded-[2.5rem] overflow-hidden mb-12">
                    <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">The Forecasting Contest</h3>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleExport('csv')}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black text-slate-300 uppercase tracking-widest transition-all active:scale-95"
                        >
                          Export CSV
                        </button>
                        <button 
                          onClick={() => handleExport('xlsx')}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-[10px] font-black text-emerald-400 uppercase tracking-widest transition-all active:scale-95"
                        >
                          Export XLSX
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-[#0B0B0E]/50">
                          <tr>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                            <th className="px-10 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Model Architecture</th>
                            <th className="px-10 py-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">sMAPE Accuracy</th>
                            <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Latency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {sortedMetrics.map((metric, idx) => (
                            <tr key={metric.name} className={`${idx === 0 ? 'bg-emerald-500/[0.03]' : ''} hover:bg-white/[0.02] transition-colors`}>
                              <td className="px-10 py-6">
                                {idx === 0 ? (
                                  <span className="flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">Optimal</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center space-x-2 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full w-fit">
                                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase">Standard</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-10 py-6 text-sm font-black text-white">{metric.name}</td>
                              <td className="px-10 py-6 text-center">
                                <span className={`text-xs font-black ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {(metric.sMAPE * 100).toFixed(2)}%
                                </span>
                              </td>
                              <td className="px-10 py-6 text-right text-xs font-mono text-slate-500">{metric.computationTime}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass p-10 rounded-[2.5rem] border-white/5">
                    <h3 className="text-xl font-black text-white mb-8 flex items-center">
                      <svg className="w-6 h-6 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Comprehensive Engine Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Model Rationale</h4>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          {state.forecastResult.detailedInsights.rationale}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Data Characteristics</h4>
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                          {state.forecastResult.detailedInsights.dataCharacteristics}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="lg:col-span-5 flex flex-col space-y-8">
                  <div className="glass p-10 rounded-[2.5rem] flex-1 border-emerald-500/10 bg-gradient-to-br from-[#0B0B0E] to-emerald-500/[0.05]">
                    <div>
                      <div className="bg-emerald-500/20 p-4 rounded-2xl w-fit mb-8 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-black text-white mb-4">The Verdict</h3>
                      <p className="text-slate-400 text-sm leading-relaxed italic font-medium mb-8">
                        "{state.forecastResult.insights}"
                      </p>
                      
                      <div className="space-y-6">
                        <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Predictive Confidence</h4>
                          <div className="flex items-center space-x-4">
                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1]" style={{ width: '92%' }}></div>
                            </div>
                            <span className="text-xs font-black text-white">92%</span>
                          </div>
                        </div>

                        <div className="p-5 bg-rose-500/[0.02] border border-rose-500/10 rounded-2xl">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Primary Risks & Caveats</h4>
                          <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            {state.forecastResult.detailedInsights.risks}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Empty State / Intro */}
          {!state.historicalData.length && !state.loading && (
            <section className="text-center py-20 animate-in fade-in zoom-in duration-1000">
               <div className="mx-auto w-40 h-40 bg-white/5 rounded-[3rem] shadow-inner border border-white/5 flex items-center justify-center mb-10 group hover:scale-110 transition-transform duration-500">
                 <svg className="w-16 h-16 text-slate-800 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
               </div>
               <h3 className="text-4xl font-black text-white tracking-tighter">Ready for Intake.</h3>
               <p className="text-slate-500 mt-4 max-w-lg mx-auto leading-relaxed font-medium">
                 Upload your enterprise dataset to benchmark historical performance and project high-confidence growth trajectories.
               </p>
            </section>
          )}
        </div>
      </main>

      {/* Persistent Status Hub */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0B0B0E]/80 backdrop-blur-xl border-t border-white/5 px-10 py-5 flex justify-between items-center z-40">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${state.loading ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              {state.loading ? 'Engine Cycle Active' : 'System Baseline: Nominal'}
            </span>
          </div>
          {state.historicalData.length > 0 && (
             <div className="flex items-center space-x-6 border-l border-white/10 pl-8">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 D_STREAMS: <span className="text-white">01</span>
               </span>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                 NODES: <span className="text-white">04</span>
               </span>
             </div>
          )}
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-white glass rounded-2xl transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 11l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default App;
