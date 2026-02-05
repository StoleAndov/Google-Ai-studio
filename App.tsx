
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { utils, writeFile } from 'xlsx';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import WebDataSearch from './components/WebDataSearch';
import Dashboard from './components/Dashboard';
import ForecastChart from './components/ForecastChart';
import { DataPoint, AppState, ForecastResponse, GroundingSource } from './types';
import { forecastService } from './services/geminiService';

type ViewMode = 'historical' | 'forecast';

const DEMO_PULSE_MS = 60 * 1000;

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { 
    autoRefresh: boolean; 
    lastSync: Date | null;
    isSyncing: boolean;
  }>({
    historicalData: [],
    forecastResult: null,
    loading: false,
    error: null,
    autoRefresh: false,
    lastSync: null,
    isSyncing: false,
    sources: []
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('historical');
  const [showDetails, setShowDetails] = useState(false);
  const syncTimerRef = useRef<number | null>(null);
  const isForecastingRef = useRef(false);

  const runEngine = useCallback(async (data: DataPoint[]) => {
    if (isForecastingRef.current) return;
    
    isForecastingRef.current = true;
    setState(prev => ({ ...prev, loading: true, isSyncing: true, error: null }));
    
    try {
      const result = await forecastService.runForecastingContest(data);
      setState(prev => ({ 
        ...prev, 
        forecastResult: result, 
        loading: false, 
        isSyncing: false, 
        error: null,
        lastSync: new Date() 
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        isSyncing: false, 
        error: err.message || "Contest engine failed. Validate data schema or check API connectivity." 
      }));
    } finally {
      isForecastingRef.current = false;
    }
  }, []);

  const handleDataLoaded = useCallback(async (data: DataPoint[], sources: GroundingSource[] = []) => {
    setState(prev => ({ 
      ...prev, 
      historicalData: data, 
      forecastResult: null, 
      error: null, 
      lastSync: new Date(),
      loading: false,
      sources: sources
    }));
    setViewMode('historical');
    setShowDetails(false);
    await runEngine(data);
  }, [runEngine]);

  // Effect 1: Purely handle the interval for data updates
  useEffect(() => {
    if (state.autoRefresh && state.historicalData.length > 0) {
      syncTimerRef.current = window.setInterval(() => {
        setState(prev => {
          if (prev.historicalData.length === 0) return prev;
          const lastPoint = prev.historicalData[prev.historicalData.length - 1];
          const nextDate = new Date(lastPoint.date);
          nextDate.setDate(nextDate.getDate() + 1);
          
          const newPoint: DataPoint = {
            date: nextDate.toISOString().split('T')[0],
            value: lastPoint.value + (Math.random() - 0.5) * 50
          };
          
          const updatedData = [...prev.historicalData, newPoint];
          return { ...prev, historicalData: updatedData };
        });
      }, DEMO_PULSE_MS);
    }
    return () => { 
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [state.autoRefresh, state.historicalData.length > 0]);

  // Effect 2: Respond to data changes by triggering the engine (Side Effect)
  useEffect(() => {
    if (state.autoRefresh && state.historicalData.length > 0 && !state.loading && !isForecastingRef.current) {
      runEngine(state.historicalData);
    }
  }, [state.historicalData.length, state.autoRefresh, runEngine]);

  const sortedMetrics = useMemo(() => {
    if (!state.forecastResult?.metrics) return [];
    return [...state.forecastResult.metrics].sort((a, b) => a.sMAPE - b.sMAPE);
  }, [state.forecastResult?.metrics]);

  const handleExport = (type: 'csv' | 'xlsx') => {
    if (!sortedMetrics.length) return;
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
    writeFile(workbook, `predictx_contest_${new Date().getTime()}.${type}`, { bookType: type });
  };

  return (
    <div className="min-h-screen pb-40 selection:bg-indigo-500/30">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-6 md:mt-12">
        <div className="flex flex-col space-y-8 md:space-y-16">
          
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 flex flex-col space-y-8">
              <WebDataSearch onDataLoaded={handleDataLoaded} isLoading={state.loading} />
              <div className="flex items-center space-x-4">
                 <div className="h-px flex-1 bg-white/5"></div>
                 <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">OR UPLOAD RAW VECTOR</span>
                 <div className="h-px flex-1 bg-white/5"></div>
              </div>
              <FileUpload onDataLoaded={(data) => handleDataLoaded(data)} isLoading={state.loading && !state.historicalData.length} />
              
              {state.error && (
                <div className="glass p-6 rounded-2xl border-rose-500/30 bg-rose-500/5 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-start space-x-4">
                    <div className="bg-rose-500/20 p-2 rounded-xl text-rose-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">System Alert</h3>
                      <p className="text-[10px] text-rose-200/70 leading-relaxed font-medium mb-3">{state.error}</p>
                      <button onClick={() => runEngine(state.historicalData)} className="px-4 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/20 rounded-lg text-[9px] font-black text-rose-400 uppercase tracking-widest transition-all">Retry</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-4 flex flex-col space-y-6">
              <div className="glass p-8 rounded-[2rem] border-indigo-500/20">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Autonomous Sync</h3>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${state.autoRefresh ? 'bg-indigo-600' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.autoRefresh ? 'left-7' : 'left-1'}`}></div>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500 uppercase">Status</span>
                    <span className={state.autoRefresh ? 'text-indigo-400 animate-pulse' : 'text-slate-600'}>{state.autoRefresh ? 'ACTIVE' : 'IDLE'}</span>
                  </div>
                  {state.lastSync && (
                    <div className="flex justify-between items-center text-[10px] font-bold pt-2 border-t border-white/5">
                      <span className="text-slate-500 uppercase tracking-widest">Last Node Sync</span>
                      <span className="text-slate-400 font-mono">{state.lastSync.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {state.sources.length > 0 && (
                <div className="glass p-8 rounded-[2rem] border-white/5">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4">Web Citations</h3>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {state.sources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                      >
                        <p className="text-[10px] font-black text-white uppercase truncate group-hover:text-indigo-400">{source.title}</p>
                        <p className="text-[8px] text-slate-500 truncate mt-1">{source.uri}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {state.historicalData.length > 0 && (
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 h-fit">
                  <button onClick={() => setViewMode('historical')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${viewMode === 'historical' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>History</button>
                  <button onClick={() => setViewMode('forecast')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center space-x-2 ${viewMode === 'forecast' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Forecast</button>
                </div>
              )}
            </div>
          </section>

          {state.historicalData.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="glass p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border-white/5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-12">
                  <div>
                    <h2 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center uppercase">
                      {viewMode === 'historical' ? 'Historical Vector Distribution' : 'Multimodel Convergence Output'}
                      {state.isSyncing && <div className="ml-3 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>}
                    </h2>
                  </div>
                  {viewMode === 'forecast' && state.forecastResult && (
                    <div className="hidden md:flex items-center space-x-4 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Top Performer</span>
                      <span className="text-sm font-black text-white">{state.forecastResult.winner}</span>
                    </div>
                  )}
                </div>
                
                <div className="relative min-h-[400px]">
                  {viewMode === 'historical' ? (
                    <Dashboard data={state.historicalData} />
                  ) : (
                    <>
                      {state.loading && !state.forecastResult && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center space-y-8 bg-[#0B0B0E]/60 backdrop-blur-sm rounded-3xl">
                          <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                          </div>
                          <div className="text-center">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Engaging AI Contest</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] animate-pulse">Running Neural Prophecies...</p>
                          </div>
                        </div>
                      )}
                      {state.forecastResult ? (
                        <div className={`transition-opacity duration-500 ${state.loading ? 'opacity-40' : 'opacity-100'}`}>
                          <ForecastChart historical={state.historicalData} forecasts={state.forecastResult.forecasts} />
                        </div>
                      ) : (
                        !state.loading && (
                           <div className="h-[400px] flex flex-col items-center justify-center text-center">
                             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-700">
                               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             </div>
                             <h4 className="text-white font-black uppercase tracking-widest mb-2">Contest Pending</h4>
                             <p className="text-xs text-slate-500 max-w-xs font-medium">The forecasting engine requires fresh vector input to initialize. Upload data or use a sample stream.</p>
                           </div>
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {viewMode === 'forecast' && state.forecastResult && (
            <section className={`grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 ${state.loading ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
              <div className="lg:col-span-7">
                <div className="glass rounded-[2rem] overflow-hidden mb-6 md:mb-12">
                  <div className="px-6 py-5 md:px-10 md:py-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Model Accuracy Benchmarks</h3>
                    <div className="flex space-x-2">
                      <button onClick={() => handleExport('csv')} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-300 uppercase">CSV</button>
                      <button onClick={() => handleExport('xlsx')} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase">XLSX</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[#0B0B0E]/50">
                        <tr>
                          <th className="px-6 py-4 md:px-10 md:py-6 text-left text-[9px] font-black text-slate-500 uppercase">Model</th>
                          <th className="px-6 py-4 md:px-10 md:py-6 text-center text-[9px] font-black text-slate-500 uppercase">sMAPE</th>
                          <th className="px-6 py-4 md:px-10 md:py-6 text-right text-[9px] font-black text-slate-500 uppercase">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[11px] font-bold">
                        {sortedMetrics.map((metric, idx) => (
                          <tr key={metric.name} className={`${idx === 0 ? 'bg-emerald-500/[0.03]' : ''}`}>
                            <td className="px-6 py-4 md:px-10 md:py-6 text-white">{metric.name}</td>
                            <td className="px-6 py-4 md:px-10 md:py-6 text-center text-emerald-400">{(metric.sMAPE * 100).toFixed(2)}%</td>
                            <td className="px-6 py-4 md:px-10 md:py-6 text-right text-slate-500">{metric.computationTime}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="glass p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-[#0B0B0E] to-indigo-500/[0.05] h-fit">
                  <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">Strategic Verdict</h3>
                  <p className="text-slate-400 text-xs md:text-sm leading-relaxed italic font-medium mb-8">"{state.forecastResult.insights}"</p>
                  
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl mb-8 shadow-inner">
                    <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Projection Confidence</h4>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-[10px] font-black text-white">92%</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full flex items-center justify-between py-4 px-6 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-2xl transition-all border border-indigo-500/20 group"
                  >
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Deep Insights Protocol</span>
                    <svg 
                      className={`w-5 h-5 text-indigo-400 transition-transform duration-500 ${showDetails ? 'rotate-180' : ''}`} 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showDetails && (
                    <div className="mt-8 space-y-8 animate-in slide-in-from-top-4 duration-500 overflow-hidden">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_#6366f1]"></div>
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Winning Rationale</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium pl-4 border-l border-white/5">
                          {state.forecastResult.detailedInsights.rationale}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Data Characteristics</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium pl-4 border-l border-white/5">
                          {state.forecastResult.detailedInsights.dataCharacteristics}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]"></div>
                          <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Contingency & Risks</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium pl-4 border-l border-white/5">
                          {state.forecastResult.detailedInsights.risks}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {!state.historicalData.length && !state.loading && (
            <section className="text-center py-10 md:py-20 animate-in fade-in zoom-in duration-1000">
               <div className="mx-auto w-24 h-24 md:w-40 md:h-40 bg-white/5 rounded-[2rem] md:rounded-[3rem] flex items-center justify-center mb-10 group transition-transform duration-500">
                 <svg className="w-10 h-10 md:w-16 md:h-16 text-slate-800 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               </div>
               <h3 className="text-2xl md:text-4xl font-black text-white tracking-tighter">System Idle.</h3>
               <p className="text-slate-500 mt-4 max-w-sm mx-auto text-xs md:text-sm leading-relaxed font-medium">Input your primary dataset to initialize the analytical engine and begin competitive forecasting.</p>
            </section>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0B0B0E]/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-40 landscape-hide md:flex">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${state.loading ? 'bg-amber-400 animate-pulse' : 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'}`}></div>
            <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{state.loading ? 'Calculating Projection' : 'Engine Standard'}</span>
          </div>
          {state.historicalData.length > 0 && (
             <div className="hidden sm:flex items-center space-x-6 border-l border-white/10 pl-6">
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active_Points: <span className="text-white">{state.historicalData.length}</span></span>
               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contest_State: <span className="text-white">{state.forecastResult ? 'Complete' : 'Pending'}</span></span>
             </div>
          )}
        </div>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-10 h-10 flex items-center justify-center text-slate-500 glass rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 11l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </div>
    </div>
  );
};

export default App;
