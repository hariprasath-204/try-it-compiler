import React, { useState } from 'react';

const OutputConsole = ({ stdout, stderr }) => {
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="bg-brand-dark/50 px-4 py-2 border-b border-white/5 font-semibold text-sm text-gray-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          Output
        </div>
        <div className="p-4 flex-1 overflow-auto bg-[#0a0f18]">
          <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-all">
            {stdout || <span className="text-gray-600 italic">No output</span>}
          </pre>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="bg-brand-dark/50 px-4 py-2 border-b border-white/5 font-semibold text-sm text-gray-300 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
           Compilation Error
        </div>
        <div className="p-4 flex-1 overflow-auto bg-[#1a0f0f]">
          <pre className="font-mono text-sm text-red-400 whitespace-pre-wrap break-all">
            {stderr || <span className="text-gray-600 italic">No errors</span>}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default OutputConsole;
