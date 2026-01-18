
import React, { useState } from 'react';
import { GenerationSettings, ImageSize } from '../types';
import { STEPS_LIMITS } from '../constants';

interface Props {
  settings: GenerationSettings;
  onChange: (updates: Partial<GenerationSettings>) => void;
}

export const GenerationSettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900/30 rounded-2xl border border-white/5 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 hover:bg-white/5 transition-all text-[10px] font-black text-gray-500 uppercase tracking-widest"
      >
        ⚙️ ПАРАМЕТРЫ ДВИЖКА
        <span className={isOpen ? 'rotate-180' : ''}>▼</span>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-white/5 space-y-6 bg-black/20">
          <div className="space-y-3">
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest block">Тип Лицензии</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ quality: 'flash' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${settings.quality === 'flash' ? 'bg-orange-500/10 border-orange-500' : 'bg-black border-white/5 opacity-40'}`}
              >
                <span className="text-[10px] font-bold uppercase">Flash</span>
                <span className="text-[7px] text-green-500 font-black">БЕСПЛАТНО</span>
              </button>
              <button
                onClick={() => onChange({ quality: 'pro' })}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${settings.quality === 'pro' ? 'bg-blue-500/10 border-blue-500' : 'bg-black border-white/5 opacity-40'}`}
              >
                <span className="text-[10px] font-bold uppercase">High-Res</span>
                <span className="text-[7px] text-blue-500 font-black">ПЛАТНО (PRO)</span>
              </button>
            </div>
          </div>

          {settings.quality === 'pro' && (
             <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block">Output Resolution</label>
               <div className="grid grid-cols-3 gap-1.5">
                 {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                   <button
                     key={size}
                     onClick={() => onChange({ imageSize: size })}
                     className={`px-2 py-2 rounded-lg text-[9px] font-black border transition-all ${settings.imageSize === size ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-black border-white/5 text-gray-600'}`}
                   >
                     {size}
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block">Spatial Seed</label>
            <input
              type="number"
              value={settings.seed}
              onChange={(e) => onChange({ seed: parseInt(e.target.value) || 0 })}
              className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-orange-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};
