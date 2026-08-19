import React from 'react';
import { Download, Terminal, FileCode2, Copy } from 'lucide-react';

export const AdminInstall: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Installer & Reseller API</h1>
        <p className="text-sm text-stone-400 mt-1">Download scripts and documentation for self-hosted resellers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
            <Terminal className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-100">One-Click Installer</h3>
          <p className="text-sm text-stone-400 mt-2 mb-6">Download the bash script to automatically provision a new VPS with Portal Uang.</p>
          <button className="w-full mt-auto px-4 py-3 bg-rose-500 hover:bg-rose-400 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Download className="w-5 h-5" /> Download install.sh
          </button>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
            <FileCode2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-100">Reseller API Docs</h3>
          <p className="text-sm text-stone-400 mt-2 mb-6">OpenAPI specification for white-label partners and resellers.</p>
          <button className="w-full mt-auto px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-stone-700">
            <Download className="w-5 h-5" /> Download Swagger.json
          </button>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm mt-6">
         <h3 className="text-lg font-bold text-stone-100 mb-4">Quick Install Command</h3>
         <div className="relative">
           <pre className="bg-stone-950 border border-stone-800 rounded-xl p-4 text-sm text-stone-300 font-mono overflow-x-auto">
             <code>curl -sSL https://auraledger.com/install.sh | bash</code>
           </pre>
           <button className="absolute top-1/2 -translate-y-1/2 right-4 p-2 text-stone-500 hover:text-stone-300 transition-colors" title="Copy to clipboard">
             <Copy className="w-4 h-4" />
           </button>
         </div>
      </div>
    </div>
  );
};
