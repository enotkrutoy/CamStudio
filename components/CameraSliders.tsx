
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
    <div className="space-y-8 bg-[#0a0a0a] p-6 lg:p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-2xl shadow-2xl">
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Spatial Telemetry</h3>
            <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-1">Manual Adjustment Module</p>
        </div>
        <button 
          onClick={onReset}
          className="px-6 py-3 bg-white/5 hover:bg-orange-600 hover:text-white text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
        >
          Reset Sync
        </button>
      </div>

      <div className="space-y-10">
        {/* Toggle Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onChange({ wideAngle: !state.wideAngle })}
            className={`p-5 rounded-[1.5rem] border transition-all flex flex-col items-center gap-3 ${state.wideAngle ? 'bg-orange-600/10 border-orange-500 text-orange-500' : 'bg-black/40 border-white/5 text-gray-600'}`}
          >
            <span className="text-xl">🔭</span>
            <div className="text-center">
                <span className="text-[9px] font-black uppercase tracking-widest block">UltraWide</span>
                <span className="text-[7px] font-bold uppercase tracking-widest opacity-50 mt-1">{state.wideAngle ? 'Active' : 'Prime'}</span>
            </div>
          </button>
          <button 
            onClick={() => onChange({ floating: !state.floating })}
            className={`p-5 rounded-[1.5rem] border transition-all flex flex-col items-center gap-3 ${state.floating ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-black/40 border-white/5 text-gray-600'}`}
          >
            <span className="text-xl">☁️</span>
            <div className="text-center">
                <span className="text-[9px] font-black uppercase tracking-widest block">Elevated</span>
                <span className="text-[7px] font-bold uppercase tracking-widest opacity-50 mt-1">{state.floating ? 'Level 2' : 'Level 1'}</span>
            </div>
          </button>
        </div>

        {/* High Performance Sliders */}
        {[
          { label: 'Azimuth Orbit', val: state.rotate, min: ROTATE_LIMITS.min, max: ROTATE_LIMITS.max, key: 'rotate', unit: '°', color: 'orange' },
          { label: 'Dolly Distance', val: state.forward, min: FORWARD_LIMITS.min, max: FORWARD_LIMITS.max, key: 'forward', unit: 'm', color: 'blue' },
          { label: 'Pitch Incline', val: state.tilt, min: TILT_LIMITS.min, max: TILT_LIMITS.max, key: 'tilt', step: 0.01, color: 'magenta' }
        ].map((ctrl) => (
          <div key={ctrl.key} className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{ctrl.label}</label>
              <div className="flex flex-col items-end">
                  <span className="text-[11px] font-mono text-white font-bold">
                    {ctrl.val.toFixed(ctrl.step ? 2 : 0)}{ctrl.unit || ''}
                  </span>
                  <div className={`w-full h-0.5 bg-${ctrl.color}-600/40 mt-1`} />
              </div>
            </div>
            <div className="relative group/slider">
                <input
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step || 1}
                  value={ctrl.val}
                  onChange={(e) => onChange({ [ctrl.key]: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-orange-600 focus:outline-none"
                />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
