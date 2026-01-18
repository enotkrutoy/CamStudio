
import React, { useState, useCallback, useEffect } from 'react';
import { CameraControlState, GenerationSettings, ImageData, GenerationResult, CameraPreset } from './types';
import { DEFAULT_SETTINGS, PRESETS } from './constants';
import { useCameraControls } from './hooks/useCameraControls';
import { Camera3DControl } from './components/Camera3DControl';
import { ImageUploader } from './components/ImageUploader';
import { GenerationSettingsPanel } from './components/GenerationSettings';
import { PromptConsole } from './components/PromptConsole';
import { HistorySidebar } from './components/HistorySidebar';
import { geminiService } from './services/geminiService';

declare global {
  // Fix: Unified modifiers for 'aistudio' to match environment definitions
  interface Window {
    readonly aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const LOADING_MESSAGES = [
  "DEEP_SCAN: Analyzing subject geometry...",
  "VOXEL_MAP: Building volumetric occlusion...",
  "RAY_CAST: Simulating 50mm optics path...",
  "NEURAL_DRAW: Reconstructing pixel clusters...",
  "FINAL_LUT: Applying cinematic color grading...",
  "IO_SYNC: Porting frame to main buffer..."
];

const App: React.FC = () => {
  const { state: cameraState, updateState: updateCamera, generatedPrompt } = useCameraControls();
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const [showKeyPicker, setShowKeyPicker] = useState(false);

  const addToHistory = useCallback((res: GenerationResult) => {
    setHistory(prev => [res, ...prev.slice(0, 9)]);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleOpenKeyPicker = async () => {
    try {
      await window.aistudio.openSelectKey();
      setShowKeyPicker(false);
      // Assume success and proceed to generate
      await startGenerationFlow();
    } catch (err) {
      setError("Failed to initialize secure key selector.");
    }
  };

  const startGenerationFlow = async () => {
    if (!sourceImage) return;
    
    if (settings.quality === 'pro') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyPicker(true);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    try {
      const editedImageUrl = await geminiService.generateImage(sourceImage, generatedPrompt, settings);
      const newResult: GenerationResult = {
        id: Math.random().toString(36).substring(7),
        imageUrl: editedImageUrl,
        prompt: generatedPrompt,
        timestamp: Date.now(),
        settings: { ...settings },
        cameraState: { ...cameraState },
      };
      setResult(newResult);
      addToHistory(newResult);
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setShowKeyPicker(true);
      }
      setError(err.message || "SYSTEM_CRITICAL_FAULT: Data buffer corrupted.");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPreset = (preset: CameraPreset) => {
    updateCamera(PRESETS[preset]);
  };

  const copyImageToClipboard = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!result?.imageUrl) return;
    setCopyStatus('loading');
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setCopyStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/40 overflow-x-hidden antialiased">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] z-50" />
      
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-[60]">
        <div className="max-w-[1700px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-2 bg-blue-500/20 rounded-xl blur-xl group-hover:bg-blue-500/40 transition-all duration-700" />
              <div className="relative w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-2xl border border-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
              </div>
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">QwenCam <span className="text-blue-500">Pro</span></h1>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] text-gray-500 font-mono tracking-widest font-black uppercase">Spatial Intelligence Lab</span>
                 <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                 <span className="text-[9px] text-blue-500/60 font-mono font-bold">STABLE_3.5.0</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-1.5 p-1 bg-white/5 rounded-full border border-white/5">
            {(['default', 'birdseye', 'dutch', 'macro', 'low-angle', 'wide-orbit'] as CameraPreset[]).map(p => (
              <button 
                key={p} 
                onClick={() => applyPreset(p)}
                className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all hover:bg-white/10 text-gray-400 hover:text-white"
              >
                {p.replace('-', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Node_Status</p>
              <p className="text-[10px] text-green-400 font-mono flex items-center gap-2 justify-end">
                READY
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-8 grid lg:grid-cols-[320px_1fr_420px] gap-10 relative z-10">
        <aside className="space-y-8">
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
          
          <div className="bg-gray-950/50 rounded-3xl border border-white/5 p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cinematic Directives</h3>
              <div className="w-8 h-[1px] bg-white/10" />
            </div>
            <textarea 
              value={settings.creativeContext}
              onChange={(e) => setSettings(s => ({...s, creativeContext: e.target.value}))}
              placeholder="Inject cinematic directives... e.g. '8k resolution, raw photo, lens flare'"
              className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-4 text-[11px] font-mono text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all resize-none placeholder:text-gray-700"
            />
            <div className="flex flex-wrap gap-2">
               {['Sci-fi', 'Retro', 'Hyper-real', 'Studio'].map(tag => (
                 <button key={tag} onClick={() => setSettings(s => ({...s, creativeContext: (s.creativeContext + ' ' + tag).trim()}))} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[8px] font-bold text-gray-500 hover:text-blue-400 transition-colors">
                   +{tag}
                 </button>
               ))}
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-3">
                <span className="w-4 h-[1px] bg-blue-500" />
                Source Buffer
              </h2>
            </div>
            {sourceImage ? (
              <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/5 bg-gray-950 shadow-2xl group">
                <img src={sourceImage.base64} alt="Source" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 flex items-center gap-4">
                  <button onClick={() => setSourceImage(null)} className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                  <div className="font-mono">
                    <p className="text-[10px] font-black text-white uppercase">{sourceImage.name}</p>
                    <p className="text-[8px] text-gray-500">ALLOCATED: {(sourceImage.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <ImageUploader onUpload={setSourceImage} />
            )}
          </div>

          <Camera3DControl state={cameraState} onChange={updateCamera} />
          <PromptConsole prompt={generatedPrompt} />
        </div>

        <aside className="space-y-8">
          <div className="relative aspect-square rounded-[3.5rem] bg-black border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden group">
            {result ? (
              <div className="relative w-full h-full">
                <img src={result.imageUrl} className="w-full h-full object-contain cursor-zoom-in animate-in fade-in duration-1000" onClick={() => setIsLightboxOpen(true)} />
                <div className="absolute top-6 right-6 flex gap-2">
                   <button onClick={copyImageToClipboard} className="w-10 h-10 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all" title="Copy to clipboard">
                     {copyStatus === 'success' ? '✓' : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>}
                   </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6 p-12 opacity-10">
                <div className="w-20 h-20 border border-dashed border-gray-400 rounded-[2rem] mx-auto flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 14.39a2 2 0 0 0 .82 1.63l2.92 2.05a2 2 0 0 1 .83 1.63V21"/><path d="M21 9.5a5.5 5.5 0 0 0-10 3.19V15"/><path d="M11 15h10"/><path d="M16 10v10"/></svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Spatial_Wait_State</p>
              </div>
            )}

            {isGenerating && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center gap-8 px-10">
                <div className="relative w-32 h-32">
                   <div className="absolute inset-0 border-[3px] border-blue-500/10 rounded-full" />
                   <div className="absolute inset-0 border-t-[3px] border-blue-500 rounded-full animate-spin shadow-[0_0_30px_rgba(59,130,246,0.4)]" />
                   <div className="absolute inset-4 border-[1px] border-white/5 rounded-full animate-[spin_4s_linear_infinite_reverse]" />
                </div>
                <div className="text-center">
                  <p className="text-blue-400 font-black text-xs tracking-[0.5em] uppercase mb-3 animate-pulse">Neural_Synthesis</p>
                  <p className="text-gray-600 font-mono text-[9px] uppercase h-4 transition-all duration-1000">{LOADING_MESSAGES[loadingMsgIndex]}</p>
                </div>
                <div className="w-full h-[1px] bg-white/5 relative overflow-hidden">
                   <div className="absolute inset-0 bg-blue-500/50 w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <a href={result?.imageUrl} download="render.png" className={`py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase text-center tracking-widest transition-all hover:scale-[1.02] active:scale-95 ${!result && 'opacity-20 pointer-events-none'}`}>
                Export
             </a>
             <button onClick={() => setIsLightboxOpen(true)} className={`py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/10 ${!result && 'opacity-20 pointer-events-none'}`}>
                Zoom
             </button>
          </div>

          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />

          <button
            onClick={startGenerationFlow}
            disabled={!sourceImage || isGenerating}
            className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.6em] shadow-[0_20px_60px_-15px_rgba(37,99,235,0.3)] transition-all relative overflow-hidden group ${(!sourceImage || isGenerating) ? 'bg-gray-900 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]'}`}
          >
            <span className="relative z-10">{isGenerating ? 'PROCESSING...' : 'INITIALIZE RENDER'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {error && <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono leading-relaxed"><span className="font-bold mr-2">FAULT:</span>{error}</div>}
        </aside>
      </main>

      {showKeyPicker && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-gray-900 border border-white/10 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl">
            <div className="w-24 h-24 bg-blue-600/10 border border-blue-600/20 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.5-2.5"/></svg>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">Pro Engine Required</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                To use the Gemini 3 Pro model, you must select an API key from a project with billing enabled.
              </p>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xs text-blue-500 hover:underline inline-block font-bold"
              >
                Learn more about billing
              </a>
            </div>
            <div className="pt-4 flex flex-col gap-4">
              <button 
                onClick={handleOpenKeyPicker}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-3xl transition-all uppercase tracking-widest text-xs"
              >
                Select API Key
              </button>
              <button 
                onClick={() => { setShowKeyPicker(false); setSettings(s => ({...s, quality: 'flash'})); }}
                className="w-full py-5 bg-white/5 hover:bg-white/10 text-gray-400 font-bold rounded-3xl transition-all uppercase tracking-widest text-xs"
              >
                Switch to Flash
              </button>
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && result && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-12 cursor-zoom-out animate-in zoom-in duration-300" onClick={() => setIsLightboxOpen(false)}>
          <img src={result.imageUrl} className="max-w-full max-h-full rounded-2xl shadow-[0_0_100px_rgba(0,0,0,1)]" />
        </div>
      )}

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default App;
