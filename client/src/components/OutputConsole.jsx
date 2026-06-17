import React from 'react';

const OutputConsole = ({ stdout, stderr }) => {
  return (
    <div className="flex flex-col flex-1 w-full h-full gap-4">
      <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col w-full h-full">
        <div className="bg-[#1e1e1e] px-4 py-2 border-b border-white/5 font-semibold text-sm text-gray-300 flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          Terminal Output
        </div>
        <div className="p-4 flex-1 overflow-auto bg-[#0a0f18] w-full h-full">
          <pre className="font-mono text-sm whitespace-pre-wrap break-all min-h-full">
            {stdout && <span className="text-gray-300">{stdout}</span>}
            {stderr && <span className="text-red-400 mt-2 block">{stderr}</span>}
            {(!stdout && !stderr) && <span className="text-gray-600 italic">No output</span>}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default OutputConsole;
