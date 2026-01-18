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
        aria-expanded={isOpen}
        aria-controls="settings-content"
        className="w-full flex justify-between items-center p-5 hover:bg-white/5 transition-all"
      >
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          Параметры Движка
        </span>
        <svg 
          className={`transform transition-transform duration-500 ${isOpen ? 'rotate-180 text-blue-500' : 'text-gray-600'}`}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div id="settings-content" className="p-5 border-t border-white/5 space-y-5 bg-black/40 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between p-2.5 bg-black/60 rounded-xl border border-white/5">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Узел Обработки</span>
            <div className="flex bg-white/5 rounded-lg p-1 gap-1">
              {(['flash', 'pro'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onChange({ quality: q })}
                  className={`px-4 py-1 rounded-md text-[9px] font-black uppercase transition-all ${settings.quality === q ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {q === 'flash' ? 'Скорость' : 'Качество'}
                </button>
              ))}
            </div>
          </div>

          {settings.quality === 'pro' && (
             <div className="space-y-2">
               <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Разрешение Рендера</label>
               <div className="grid grid-cols-3 gap-1.5">
                 {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                   <button
                     key={size}
                     onClick={() => onChange({ imageSize: size })}
                     className={`px-2 py-2 rounded-xl text-[9px] font-black border transition-all ${settings.imageSize === size ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-black border-white/5 text-gray-600 hover:text-gray-400'}`}
                   >
                     {size}
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block ml-1">Пространственный Seed</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.seed}
                onChange={(e) => onChange({ seed: parseInt(e.target.value) || 0 })}
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <button 
                onClick={randomizeSeed}
                aria-label="Случайный Seed"
                className="bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/5 transition-all text-gray-400 hover:text-blue-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12V7.5a2.5 2.5 0 1 0-5 0V12a2.5 2.5 0 1 1-5 0V7.5a2.5 2.5 0 1 0-5 0V12"/><path d="m3 16 3 3 3-3"/><path d="M6 19v-4"/></svg>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end ml-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Итерации Оптимизации</label>
              <span className="text-[10px] font-mono text-blue-400 font-bold">{settings.steps}</span>
            </div>
            <input
              type="range"
              min={STEPS_LIMITS.min}
              max={STEPS_LIMITS.max}
              value={settings.steps}
              onChange={(e) => onChange({ steps: parseInt(e.target.value) })}
              className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
};