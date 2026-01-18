
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GenerationSettings, ImageData, GenerationResult, CameraPreset } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { useCameraControls } from './hooks/useCameraControls';
import { Camera3DControl } from './components/Camera3DControl';
import { ImageUploader } from './components/ImageUploader';
import { GenerationSettingsPanel } from './components/GenerationSettings';
import { PromptConsole } from './components/PromptConsole';
import { HistorySidebar } from './components/HistorySidebar';
import { CameraSliders } from './components/CameraSliders';
import { PresetGallery } from './components/PresetGallery';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const { state: cameraState, updateState: updateCamera, reset: resetCamera, generatedPrompt } = useCameraControls();
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<{message: string, type: 'critical' | 'warning' | 'key' | 'safety' | 'quota'} | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');
  
  // Interactive result states
  const [isComparing, setIsComparing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success'>('idle');

  const handleSettingsUpdate = useCallback(async (updates: Partial<GenerationSettings>) => {
    if (updates.quality === 'pro') {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio?.openSelectKey();
      }
    }
    setSettings(s => ({ ...s, ...updates }));
  }, []);

  const copyImageToClipboard = async () => {
    if (!result?.imageUrl) return;
    setCopyStatus('copying');
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error("Failed to copy image", err);
      setCopyStatus('idle');
    }
  };

  const startGenerationFlow = useCallback(async () => {
    if (!sourceImage || isGenerating) return;

    if (settings.quality === 'pro') {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio?.openSelectKey();
      }
    }

    setIsGenerating(true);
    setError(null);
    setRetrySeconds(0);
    setResult(null); // Clear previous result for new stream

    try {
      const response = await geminiService.generateImage(
        sourceImage, 
        generatedPrompt, 
        settings,
        (sec) => setRetrySeconds(sec)
      );

      const newResult: GenerationResult = {
        id: Math.random().toString(36).substring(7),
        imageUrl: response.imageUrl,
        prompt: generatedPrompt,
        modelResponse: response.modelResponse,
        timestamp: Date.now(),
        settings: { ...settings },
        cameraState: { ...cameraState },
        groundingChunks: response.groundingChunks,
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 20));

      if (!response.imageUrl && response.modelResponse) {
        setError({ 
          message: "Neural Block: Identity synchronization threshold failed. Outputting analysis only.", 
          type: 'warning' 
        });
      }
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        setError({ message: "API Authentication Failure. Re-link required.", type: 'key' });
        await window.aistudio?.openSelectKey();
      } else {
        const msg = err.message?.toLowerCase() || '';
        if (msg.includes("safety") || msg.includes("finishreason: safety")) {
          setError({ message: "Bio-Safety: Modification denied by core protocols.", type: 'safety' });
        } else if (msg.includes("429") || msg.includes("quota")) {
          setError({ message: "Neural Overload. Scaling back requests.", type: 'quota' });
        } else {
          setError({ message: "Spatial Sync Error. Engine reboot required.", type: 'critical' });
        }
      }
    } finally {
      setIsGenerating(false);
      setRetrySeconds(0);
    }
  }, [sourceImage, isGenerating, generatedPrompt, settings, cameraState]);

  const resetSession = useCallback(() => {
    setSourceImage(null);
    setResult(null);
    setError(null);
    resetCamera();
  }, [resetCamera]);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {/* Zoom Modal */}
      {isZoomed && result?.imageUrl && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 lg:p-20 animate-in fade-in duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={result.imageUrl} 
            className="max-w-full max-h-full object-contain rounded-3xl shadow-[0_0_100px_rgba(234,88,12,0.2)]" 
            alt="Full Preview"
          />
          <button className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}

      {/* Dynamic Header */}
      <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-black/80 backdrop-blur-2xl sticky top-0 z-[100] shadow-2xl">
        <div className="flex gap-10 h-full">
          <button onClick={() => setActiveTab('3d')} className={`h-full border-b-2 transition-all font-black text-[10px] uppercase tracking-[0.3em] ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-600 hover:text-gray-300'}`}>
            Neural Viewport
          </button>
          <button onClick={() => setActiveTab('sliders')} className={`h-full border-b-2 transition-all font-black text-[10px] uppercase tracking-[0.3em] ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-600 hover:text-gray-300'}`}>
            Manual Override
          </button>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Core Status</span>
             <span className="text-[10px] font-mono text-green-500 font-bold uppercase tracking-widest">Sync // Stable</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-black italic">Q3</div>
        </div>
      </header>

      <main className="flex-1 p-8 lg:p-16 max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-16">
        <div className="flex flex-col gap-12">
          {/* Main Workspace */}
          <div className="relative aspect-[16/10] min-h-[600px] bg-black rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
            {activeTab === '3d' ? (
              <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} onReplace={resetSession} activePreset={undefined} />
            ) : (
              <div className="p-16 h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#080808] to-black">
                <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
              </div>
            )}
            {!sourceImage && (
              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
                <ImageUploader onUpload={setSourceImage} />
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button 
              onClick={resetSession}
              disabled={!sourceImage || isGenerating}
              className="bg-white/2 border border-white/5 py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] text-gray-600 hover:text-white hover:bg-white/5 transition-all disabled:opacity-20 active:scale-95"
            >
              Purge Buffer
            </button>
            <button 
              onClick={resetCamera} 
              disabled={!sourceImage || isGenerating}
              className="bg-[#0a0a0a] border border-white/5 py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] text-gray-500 hover:text-white hover:border-orange-500/30 transition-all disabled:opacity-20 active:scale-95"
            >
              Reset Vector
            </button>
            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating}
              className={`py-8 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all relative overflow-hidden active:scale-95 ${(!sourceImage || isGenerating) ? 'bg-gray-900 text-gray-700 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-[0_0_50px_rgba(234,88,12,0.4)]'}`}
            >
              {retrySeconds > 0 ? `Resume in ${retrySeconds}s` : (isGenerating ? 'Rendering...' : 'Commit Synthesis')}
              {isGenerating && <div className="absolute bottom-0 left-0 h-1.5 bg-white/40 animate-progress w-full" />}
            </button>
          </div>
          
          <PromptConsole prompt={generatedPrompt} modelResponse={result?.modelResponse} isGenerating={isGenerating} />
        </div>

        {/* Side Controls & Results */}
        <aside className="flex flex-col gap-12">
          <div className="relative aspect-square rounded-[3.5rem] bg-[#050505] border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl group">
            {result ? (
              <div className="w-full h-full relative overflow-hidden">
                {result.imageUrl ? (
                  <>
                    <img 
                      src={isComparing ? sourceImage?.base64 : result.imageUrl} 
                      className={`w-full h-full object-cover transition-all duration-300 ${isComparing ? 'scale-105 blur-[2px] opacity-80' : 'group-hover:scale-105'}`} 
                      alt="Synthesis Result" 
                    />
                    
                    {/* Interactive Overlay Buttons */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsZoomed(true)}
                          className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-all"
                          title="Zoom In"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                        </button>
                        <button 
                          onClick={copyImageToClipboard}
                          className={`w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all ${copyStatus === 'success' ? 'text-green-500' : 'text-white hover:bg-orange-500'}`}
                          title="Copy Image"
                        >
                          {copyStatus === 'success' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          )}
                        </button>
                      </div>
                      <button 
                        onMouseDown={() => setIsComparing(true)}
                        onMouseUp={() => setIsComparing(false)}
                        onMouseLeave={() => setIsComparing(false)}
                        className={`px-5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${isComparing ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M10 8H8v2"/><path d="M14 8h2v2"/><path d="M10 16H8v-2"/><path d="M14 16h2v-2"/></svg>
                        Hold to Compare
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-16 text-center gap-8">
                    <div className="w-24 h-24 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m4.93 19.07 14.14-14.14"/></svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Identity Mismatch</p>
                      <p className="text-[9px] text-gray-600 leading-relaxed font-medium">Core engine blocked visualization due to identity drift. Analyze neural metadata below.</p>
                    </div>
                  </div>
                )}
                
                {result.groundingChunks && result.groundingChunks.length > 0 && (
                  <div className="absolute bottom-6 left-6 right-6 bg-black/90 backdrop-blur-3xl p-5 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-20">
                    <p className="text-[9px] font-black text-blue-500 uppercase mb-3 tracking-[0.2em]">Neural Citations Found</p>
                    <div className="flex flex-col gap-2">
                      {result.groundingChunks.map((c, i) => (c.web || c.maps) && (
                        <a key={i} href={c.web?.uri || c.maps?.uri} target="_blank" className="text-[10px] text-gray-400 hover:text-blue-400 transition-colors truncate flex items-center gap-2">
                           <span className="w-1 h-1 bg-blue-500 rounded-full" />
                           {c.web?.title || c.maps?.title || "Reference Source"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 opacity-10">
                <div className="w-20 h-20 border-t-2 border-orange-500 rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400">Feed Offline</span>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 z-[200]">
                <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.5em] animate-pulse">Syncing Perspective</p>
              </div>
            )}
          </div>
          
          <PresetGallery onSelect={(s) => updateCamera(s)} />
          <GenerationSettingsPanel settings={settings} onChange={handleSettingsUpdate} />
          <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
        </aside>
      </main>

      {/* Global Error Notifications */}
      {error && error.type !== 'warning' && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[500] w-full max-w-lg px-8 animate-in slide-in-from-bottom-12 duration-500">
          <div className={`p-8 rounded-[2.5rem] border shadow-[0_50px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl flex items-center justify-between gap-8 ${error.type === 'safety' ? 'bg-red-500/10 border-red-500/40' : 'bg-orange-500/10 border-orange-500/40'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${error.type === 'safety' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>!</div>
              <div>
                 <p className="text-[11px] font-black uppercase tracking-widest text-white mb-1">{error.type.toUpperCase()} ALERT</p>
                 <p className="text-[10px] text-gray-400 font-medium">{error.message}</p>
              </div>
            </div>
            <button onClick={() => setError(null)} className="text-white/20 hover:text-white p-3 bg-white/5 rounded-full transition-colors">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
