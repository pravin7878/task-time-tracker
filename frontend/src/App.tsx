import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <header className="max-w-xl w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-4 font-bold text-xl">
          TT
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
          Task & Time Tracking App
        </h1>
        <p className="text-slate-600 mt-2 text-sm">
          Project foundation and scaffolding initialized successfully.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Milestone 1: Ready for Milestone 2
        </div>
      </header>
    </div>
  );
};

export default App;
