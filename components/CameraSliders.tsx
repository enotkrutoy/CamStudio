
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
    <div className="space-y-8 bg-white/2 p-6 lg:p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-inner">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Spatial Controls</h3>
        <button 
          onClick={onReset}
          className="px-4 py-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
        >
          Reset Sync
        </button>
      </div>

      <div className="space-y-8">
        {/* Toggle Controls */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onChange({ wideAngle: !state.wideAngle })}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${state.wideAngle ? 'bg-orange-600/10 border-orange-500 text-orange-500' : 'bg-black/40 border-white/5 text-gray-600'}`}
          >
            <span className="text-lg">🔭</span>
            <span className="text-[8px] font-black uppercase tracking-widest">Wide Angle</span>
          </button>
          <button 
            onClick={() => onChange({ floating: !state.floating })}
            className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${state.floating ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-black/40 border-white/5 text-gray-600'}`}
          >
            <span className="text-lg">☁️</span>
            <span className="text-[8px] font-black uppercase tracking-widest">Floating</span>
          </button>
        </div>

        {/* Range Controls */}
        {[
          { label: 'Azimuth Rotation', val: state.rotate, min: ROTATE_LIMITS.min, max: ROTATE_LIMITS.max, key: 'rotate', unit: '°' },
          { label: 'Dolly Distance', val: state.forward, min: FORWARD_LIMITS.min, max: FORWARD_LIMITS.max, key: 'forward', unit: 'm' },
          { label: 'Pitch Angle', val: state.tilt, min: TILT_LIMITS.min, max: TILT_LIMITS.max, key: 'tilt', step: 0.01 }
        ].map((ctrl) => (
          <div key={ctrl.key} className="space-y-3">
            <div className="flex justify-between">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{ctrl.label}</label>
              <span className="text-[10px] font-mono text-orange-500 font-bold">
                {ctrl.val.toFixed(ctrl.step ? 2 : 0)}{ctrl.unit || ''}
              </span>
            </div>
            <input
              type="range"
              min={ctrl.min}
              max={ctrl.max}
              step={ctrl.step || 1}
              value={ctrl.val}
              onChange={(e) => onChange({ [ctrl.key]: parseFloat(e.target.value) })}
              className="w-full h-2 lg:h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
