
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
    <div className="bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="settings-content"
        className="w-full flex justify-between items-center p-4 hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          Engine Parameters
        </span>
        <svg 
          className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && (
        <div id="settings-content" className="p-4 border-t border-gray-800 space-y-4 bg-gray-900/60 backdrop-blur-md">
          <div className="flex items-center justify-between p-2 bg-gray-950 rounded-lg border border-gray-800">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Processing Node</span>
            <div className="flex bg-gray-900 rounded-md p-1 gap-1">
              {(['flash', 'pro'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => onChange({ quality: q })}
                  className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${settings.quality === q ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {settings.quality === 'pro' && (
             <div>
               <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Render Resolution</label>
               <div className="grid grid-cols-3 gap-1">
                 {(['1K', '2K', '4K'] as ImageSize[]).map((size) => (
                   <button
                     key={size}
                     onClick={() => onChange({ imageSize: size })}
                     className={`px-2 py-1.5 rounded text-[9px] font-bold border transition-all ${settings.imageSize === size ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-black border-white/5 text-gray-600 hover:text-gray-400'}`}
                   >
                     {size}
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div>
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Spatial Seed</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={settings.seed}
                onChange={(e) => onChange({ seed: parseInt(e.target.value) || 0 })}
                className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xs font-mono text-blue-400 focus:outline-none focus:border-blue-500/50"
              />
              <button 
                onClick={randomizeSeed}
                aria-label="Randomize Seed"
                className="bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12V7.5a2.5 2.5 0 1 0-5 0V12a2.5 2.5 0 1 1-5 0V7.5a2.5 2.5 0 1 0-5 0V12"/><path d="m3 16 3 3 3-3"/><path d="M6 19v-4"/></svg>
              </button>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Iterative Refinement</label>
              <span className="text-[10px] font-mono text-blue-400">{settings.steps}</span>
            </div>
            <input
              type="range"
              min={STEPS_LIMITS.min}
              max={STEPS_LIMITS.max}
              value={settings.steps}
              onChange={(e) => onChange({ steps: parseInt(e.target.value) })}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
