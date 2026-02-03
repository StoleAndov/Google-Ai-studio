
import React, { useRef, useState, useMemo } from 'react';
import { read, utils } from 'xlsx';
import { DataPoint } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: DataPoint[]) => void;
  isLoading: boolean;
}

enum Stage {
  UPLOAD,
  VERIFY
}

interface ColumnMeta {
  index: number;
  header: string;
  isLikelyDate: boolean;
  isLikelyNumeric: boolean;
  numericDensity: number;
  dateDensity: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>(Stage.UPLOAD);
  const [error, setError] = useState<string | null>(null);
  const [cleaningStatus, setCleaningStatus] = useState<string | null>(null);
  
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMeta, setColumnMeta] = useState<ColumnMeta[]>([]);
  const [selectedDateCol, setSelectedDateCol] = useState<number>(-1);
  const [selectedMetricCol, setSelectedMetricCol] = useState<number>(-1);

  const cleanNumericString = (val: string): number | null => {
    if (!val) return null;
    const cleaned = val.replace(/[$,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const tryParseDate = (val: string): number | null => {
    if (!val || val.length < 4) return null;
    const d = new Date(val);
    const time = d.getTime();
    return isNaN(time) ? null : time;
  };

  const interpolateValues = (data: (number | null)[]): number[] => {
    const result = [...data];
    for (let i = 0; i < result.length; i++) {
      if (result[i] === null) {
        let prevIdx = i - 1;
        while (prevIdx >= 0 && result[prevIdx] === null) prevIdx--;
        let nextIdx = i + 1;
        while (nextIdx < result.length && result[nextIdx] === null) nextIdx++;
        if (prevIdx >= 0 && nextIdx < result.length) {
          const y1 = result[prevIdx]!;
          const y2 = result[nextIdx]!;
          result[i] = y1 + (i - prevIdx) * (y2 - y1) / (nextIdx - prevIdx);
        } else if (prevIdx >= 0) {
          result[i] = result[prevIdx]!;
        } else if (nextIdx < result.length) {
          result[i] = result[nextIdx]!;
        } else {
          result[i] = 0;
        }
      }
    }
    return result as number[];
  };

  const processRawArray = (headers: string[], rows: string[][]) => {
    setError(null);
    setCleaningStatus("Analyzing schema...");
    const numRows = rows.length;

    const stats: ColumnMeta[] = headers.map((header, colIndex) => {
      let dateMatches = 0;
      let numericMatches = 0;
      rows.forEach(row => {
        if (tryParseDate(row[colIndex])) dateMatches++;
        if (cleanNumericString(row[colIndex]) !== null) numericMatches++;
      });
      return {
        index: colIndex,
        header,
        isLikelyDate: dateMatches / numRows > 0.4,
        isLikelyNumeric: numericMatches / numRows > 0.4,
        dateDensity: dateMatches / numRows,
        numericDensity: numericMatches / numRows
      };
    });

    const bestDate = [...stats].filter(s => s.isLikelyDate).sort((a,b) => b.dateDensity - a.dateDensity)[0];
    const bestMetric = [...stats].filter(s => s.isLikelyNumeric && (!bestDate || s.index !== bestDate.index)).sort((a,b) => b.numericDensity - a.numericDensity)[0];

    if (!bestDate) throw new Error("No chronological column detected. Ensure your file has a date column.");
    if (!bestMetric) throw new Error("No numeric metric values detected.");

    setRawHeaders(headers);
    setRawRows(rows);
    setColumnMeta(stats);
    setSelectedDateCol(bestDate.index);
    setSelectedMetricCol(bestMetric.index);
    setStage(Stage.VERIFY);
    setCleaningStatus(null);
  };

  const handleFinalConfirm = () => {
    setCleaningStatus("Cleansing Vector Stream...");
    const tempPoints: { date: string; value: number | null; timestamp: number }[] = [];
    
    rawRows.forEach(row => {
      const ts = tryParseDate(row[selectedDateCol]);
      const val = cleanNumericString(row[selectedMetricCol]);
      if (ts !== null) {
        tempPoints.push({
          date: new Date(ts).toISOString().split('T')[0],
          value: val,
          timestamp: ts
        });
      }
    });

    tempPoints.sort((a, b) => a.timestamp - b.timestamp);
    const interpolated = interpolateValues(tempPoints.map(p => p.value));
    const finalData: DataPoint[] = tempPoints.map((p, i) => ({
      date: p.date,
      value: interpolated[i]
    }));

    onDataLoaded(finalData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCleaningStatus("Streaming content...");
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to a 2D array of strings for our existing cleaning logic
        const rows = utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (rows.length < 2) throw new Error("Dataset is too small to analyze.");

        const headers = rows[0].map(h => String(h || '').trim());
        const dataRows = rows.slice(1).map(row => 
          row.map(cell => {
            if (cell === null || cell === undefined) return '';
            if (cell instanceof Date) return cell.toISOString();
            return String(cell).trim();
          })
        );

        processRawArray(headers, dataRows);
      } catch (err: any) {
        setError(err.message || "Failed to process file. Ensure it is a valid CSV or Excel file.");
        setCleaningStatus(null);
      }
    };

    reader.onerror = () => {
      setError("Read error. The file might be corrupted.");
      setCleaningStatus(null);
    };

    reader.readAsArrayBuffer(file);
  };

  const previewData = useMemo(() => {
    if (selectedDateCol === -1 || selectedMetricCol === -1) return [];
    return rawRows.slice(0, 5).map(row => {
      const ts = tryParseDate(row[selectedDateCol]);
      const val = cleanNumericString(row[selectedMetricCol]);
      return {
        date: ts ? new Date(ts).toLocaleDateString() : 'VOID',
        val: val !== null ? val.toLocaleString() : 'VOID'
      };
    });
  }, [rawRows, selectedDateCol, selectedMetricCol]);

  if (stage === Stage.VERIFY) {
    return (
      <div className="glass p-10 rounded-[2.5rem] animate-in fade-in zoom-in duration-500 shadow-2xl">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Schema Validation</h2>
            <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Map chronological and metric dimensions.</p>
          </div>
          <button 
            onClick={() => setStage(Stage.UPLOAD)}
            className="text-[10px] font-black uppercase tracking-widest text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-colors"
          >
            Purge Upload
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
          <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Chronological Index</label>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                <select 
                  value={selectedDateCol}
                  onChange={(e) => setSelectedDateCol(parseInt(e.target.value))}
                  className="bg-transparent border-none text-white font-black text-lg focus:ring-0 cursor-pointer outline-none w-full"
                >
                  {columnMeta.filter(c => c.isLikelyDate).map(c => (
                    <option key={c.index} value={c.index} className="bg-[#1a1a21]">{c.header}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 group">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Forecasting Vector</label>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <select 
                  value={selectedMetricCol}
                  onChange={(e) => setSelectedMetricCol(parseInt(e.target.value))}
                  className="bg-transparent border-none text-white font-black text-lg focus:ring-0 cursor-pointer outline-none w-full"
                >
                  {columnMeta.filter(c => c.isLikelyNumeric && c.index !== selectedDateCol).map(c => (
                    <option key={c.index} value={c.index} className="bg-[#1a1a21]">{c.header}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0B0B0E] rounded-3xl overflow-hidden border border-white/5 shadow-inner">
            <div className="bg-white/[0.02] px-6 py-4 flex justify-between items-center border-b border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Stream Preview (Cleaned)</span>
            </div>
            <table className="min-w-full text-[11px] font-bold">
              <thead className="text-slate-500 uppercase tracking-widest bg-white/[0.01]">
                <tr>
                  <th className="px-6 py-4 text-left">{rawHeaders[selectedDateCol]}</th>
                  <th className="px-6 py-4 text-right">{rawHeaders[selectedMetricCol]}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-mono">{row.date}</td>
                    <td className="px-6 py-3 text-right text-emerald-400 font-black">{row.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={handleFinalConfirm}
          disabled={isLoading}
          className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center space-x-4 active:scale-[0.98]"
        >
          {isLoading ? (
             <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <>
              <span className="text-lg uppercase tracking-widest">Execute Contest Engine</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="glass p-16 rounded-[3.5rem] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
      <div className="max-w-xl mx-auto text-center relative z-10">
        <div className="mb-12">
          <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-10 shadow-[0_0_40px_rgba(79,70,229,0.4)] transform group-hover:rotate-6 group-hover:scale-110 transition duration-500">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-6 uppercase">Predictive<br/><span className="text-indigo-500">Intake</span></h2>
          <p className="text-slate-500 text-lg font-medium leading-relaxed"> Benchmarking historical distribution to project high-fidelity trajectories.</p>
        </div>

        <div className="space-y-6">
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            onChange={handleFileChange} 
            ref={fileInputRef} 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-6 bg-white hover:bg-slate-100 text-slate-950 text-xl font-black rounded-3xl shadow-2xl transition-all active:scale-[0.97] uppercase tracking-tighter"
          >
            Upload Source (CSV / XLSX)
          </button>
          
          <div className="flex items-center justify-center space-x-6 pt-4">
            <div className="h-px w-20 bg-white/5"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Simulation</span>
            <div className="h-px w-20 bg-white/5"></div>
          </div>

          <button
            onClick={() => onDataLoaded(generateSample())}
            className="w-full py-5 text-sm font-black text-indigo-400 border border-indigo-500/20 rounded-3xl hover:bg-indigo-500/5 transition-all uppercase tracking-widest"
          >
            Inject Sample Stream
          </button>

          {error && (
            <div className="mt-8 p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-3xl text-sm font-bold text-left flex items-start space-x-4 shadow-inner">
              <svg className="w-6 h-6 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span>{error}</span>
            </div>
          )}
          
          {cleaningStatus && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-indigo-400 font-bold text-xs uppercase animate-pulse">
               <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <span>{cleaningStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function generateSample(): DataPoint[] {
  const sample: DataPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(now.getDate() - (90 - i));
    sample.push({
      date: d.toISOString().split('T')[0],
      value: 500 + i * 2 + Math.sin(i * 0.3) * 100 + Math.random() * 50
    });
  }
  return sample;
}

export default FileUpload;
