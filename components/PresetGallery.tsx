
import React from 'react';
import { CameraPreset, CameraControlState } from '../types';
import { PRESET_LIST } from '../constants';

interface Props {
  activePreset?: CameraPreset;
  onSelect: (state: Partial<CameraControlState>, id: CameraPreset) => void;
}

export const PresetGallery: React.FC<Props> = ({ activePreset, onSelect }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Библиотека Ракурсов</h3>
        <span className="text-[8px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-bold">SMART_SYNC</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {PRESET_LIST.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.state, preset.id)}
            className={`
              group relative p-4 rounded-[1.5rem] border text-left transition-all duration-300
              ${activePreset === preset.id 
                ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.15)]' 
                : 'bg-white/2 border-white/5 hover:border-white/20 hover:bg-white/5'}
            `}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xl group-hover:scale-125 transition-transform duration-500 block w-fit">
                {preset.icon}
              </span>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-tight ${activePreset === preset.id ? 'text-orange-400' : 'text-gray-300'}`}>
                  {preset.label}
                </p>
                <p className="text-[8px] text-gray-500 leading-tight mt-1 line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </div>
            
            {activePreset === preset.id && (
              <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
