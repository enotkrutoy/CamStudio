
import React, { useState } from 'react';
import { GenerationSettings, ImageSize } from '../types';
import { STEPS_LIMITS } from '../constants';

interface Props {
  settings: GenerationSettings;
  onChange: (updates: Partial<GenerationSettings>) => void;
}

export const GenerationSettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const randomizeSeed = () => {
    onChange({ seed: Math.floor(Math.random() * 2147483647) });
  };

  return (
    <div className="bg-gray-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 hover:bg-white/5 transition-all"
      >
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
          ⚙️ ПАРАМЕТРЫ ДВИЖКА
        </span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-white/5 space-y-6 bg-black/20 animate-in slide-in-from-top-1">
          <div className="space-y-3">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Режим Рендеринга</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ quality: 'flash' })}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${settings.quality === 'flash' ? 'bg-orange-500/10 border-orange-500' : 'bg-black border-white/5 opacity-50'}`}
              >
                <span className="text-[10px] font-black uppercase mb-1">Flash</span>
                <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">Free Tier</span>
              </button>
              <button
                onClick={() => onChange({ quality: 'pro' })}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${settings.quality === 'pro' ? 'bg-blue-500/10 border-blue-500' : 'bg-black border-white/5 opacity-50'}`}
              >
                <span className="text-[10px] font-black uppercase mb-1">Pro</span>
                <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">High Fidelity</span>
              </button>
            </div>
          </div>

          {settings.quality === 'pro' && (
             <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Разрешение Pro</label>
               <div className="grid grid-cols-3 gap-1.5">
                 {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                   <button
                     key={size}
                     onClick={() => onChange({ imageSize: size })}
                     className={`px-2 py-2 rounded-xl text-[9px] font-black border transition-all ${settings.imageSize === size ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-black border-white/5 text-gray-600'}`}
                   >
                     {size}
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Spatial Seed</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.seed}
                onChange={(e) => onChange({ seed: parseInt(e.target.value) || 0 })}
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-orange-400 focus:outline-none"
              />
              <button 
                onClick={randomizeSeed}
                className="bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl border border-white/5 text-gray-400"
              >
                🎲
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Optimization Steps</label>
              <span className="text-[10px] font-mono text-orange-400 font-bold">{settings.steps}</span>
            </div>
            <input
              type="range"
              min={STEPS_LIMITS.min}
              max={STEPS_LIMITS.max}
              value={settings.steps}
              onChange={(e) => onChange({ steps: parseInt(e.target.value) })}
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
