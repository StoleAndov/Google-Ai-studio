import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-white/5 bg-[#0B0B0E]/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="flex justify-between items-center h-14 md:h-20">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="bg-indigo-600 p-1.5 md:p-2.5 rounded-lg md:rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-lg md:text-2xl font-black tracking-tighter text-white logo-text">
              PREDICT<span className="text-indigo-500">X</span>
            </span>
          </div>
          <nav className="hidden lg:flex space-x-10 landscape-hide">
            <a href="#" className="text-sm font-bold text-white">Engine</a>
            <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Datasets</a>
            <a href="#" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Reports</a>
          </nav>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 md:px-4 md:py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-500">Active</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;