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
    <div className="bg-gray-950/50 rounded-[2rem] border border-white/5 p-6 space-y-6 animate-in slide-in-from-left-4 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">История Сессии</h3>
        <button 
          onClick={onClear}
          className="text-[9px] text-red-400/30 hover:text-red-400 transition-all uppercase font-black px-2 py-1 bg-red-500/5 rounded-md hover:bg-red-500/10"
        >
          Очистить
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
        {history.map((item) => (
          <div 
            key={item.id}
            onClick={() => onSelect(item)}
            className="group relative aspect-square rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-blue-500/40 transition-all bg-black shadow-2xl active:scale-95"
          >
            <img src={item.imageUrl} alt="Превью" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
              <p className="text-[9px] text-blue-400 font-mono font-black uppercase">
                {new Date(item.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};