
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
    <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Session History</h3>
        <button 
          onClick={onClear}
          className="text-[9px] text-red-400/50 hover:text-red-400 transition-colors uppercase font-bold"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {history.map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className="group relative aspect-square rounded-lg overflow-hidden border border-gray-800 cursor-pointer hover:border-blue-500/50 transition-all bg-black shadow-lg"
          >
            <img src={item.imageUrl} alt="History" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[8px] text-blue-400 font-mono font-bold truncate">
                {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
