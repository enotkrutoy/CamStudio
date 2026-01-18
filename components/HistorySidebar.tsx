
import React from 'react';
import { GenerationResult } from '../types';

interface Props {
  history: GenerationResult[];
  onSelect: (result: GenerationResult) => void;
  onClear: () => void;
}

export const HistorySidebar: React.FC<Props> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white/2 rounded-[2rem] border border-white/5 p-6 space-y-6 flex-shrink-0">
      <div className="flex justify-between items-center">
        <h3 className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Session Log</h3>
        <button onClick={onClear} className="text-[8px] text-red-500/50 hover:text-red-500 uppercase font-black">Clear</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {history.map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 cursor-pointer bg-black transition-all hover:border-orange-500/50"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="P" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-900/50">
                <span className="text-[7px] font-black text-gray-700 uppercase">Analysis</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded-md opacity-0 group-hover:opacity-100">
               <span className="text-[7px] font-mono text-gray-400">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
