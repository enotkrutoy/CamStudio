import React from 'react';
import { CameraControlState } from '../types';
import { ROTATE_LIMITS, FORWARD_LIMITS, TILT_LIMITS } from '../constants';

interface Props {
  state: CameraControlState;
  onChange: (updates: Partial<CameraControlState>) => void;
  onReset: () => void;
}

export const CameraSliders: React.FC<Props> = ({ state, onChange, onReset }) => {
  return (
    <div className="space-y-6 bg-gray-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ручное Управление</h3>
        <button 
          onClick={onReset}
          className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 font-bold uppercase"
        >
          Сброс
        </button>
      </div>

      <div className="space-y-5">
        {/* Floating Effect Toggle */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <label className="text-[11px] font-bold text-blue-400 cursor-pointer select-none flex items-center gap-3">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${state.floating ? 'bg-blue-600' : 'bg-gray-800'}`}>
              <input
                type="checkbox"
                checked={state.floating}
                onChange={(e) => onChange({ floating: e.target.checked })}
                className="hidden"
              />
              <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-lg transition-transform ${state.floating ? 'translate-x-4' : ''}`} />
            </div>
            Эффект Левитации
          </label>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md tracking-widest uppercase ${state.floating ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600'}`}>
            {state.floating ? 'ВКЛ' : 'ВЫКЛ'}
          </span>
        </div>

        {/* Rotation */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">Вращение (Градусы)</label>
            <span className="text-[10px] font-mono text-blue-400 font-bold">{state.rotate.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            min={ROTATE_LIMITS.min}
            max={ROTATE_LIMITS.max}
            step="0.5"
            value={state.rotate}
            onChange={(e) => onChange({ rotate: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        {/* Forward */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">Дистанция / Зум</label>
            <span className="text-[10px] font-mono text-blue-400 font-bold">{state.forward.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={FORWARD_LIMITS.min}
            max={FORWARD_LIMITS.max}
            step="0.1"
            value={state.forward}
            onChange={(e) => onChange({ forward: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        {/* Tilt */}
        <div className="group">
          <div className="flex justify-between mb-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">Вертикальный Наклон</label>
            <span className="text-[10px] font-mono text-blue-400 font-bold">{state.tilt.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={TILT_LIMITS.min}
            max={TILT_LIMITS.max}
            step="0.01"
            value={state.tilt}
            onChange={(e) => onChange({ tilt: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        {/* Wide Angle */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <label className="text-[11px] font-bold text-gray-400 cursor-pointer select-none flex items-center gap-3 hover:text-gray-200 transition-colors">
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${state.wideAngle ? 'bg-blue-600 border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-white/5 border-white/10'}`}>
              <input
                type="checkbox"
                checked={state.wideAngle}
                onChange={(e) => onChange({ wideAngle: e.target.checked })}
                className="hidden"
              />
              {state.wideAngle && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            Широкоугольный Объектив
          </label>
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md tracking-widest uppercase ${state.wideAngle ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-600'}`}>
            {state.wideAngle ? 'АКТИВЕН' : 'ВЫКЛ'}
          </span>
        </div>
      </div>
    </div>
  );
};