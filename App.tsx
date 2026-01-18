import React, { useState, useEffect } from 'react';
import { GenerationSettings, ImageData, GenerationResult, CameraPreset, GroundingChunk } from './types';
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

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

interface AppError {
  message: string;
  type: 'quota' | 'auth' | 'system';
}

const GroundingLinks: React.FC<{ chunks?: GroundingChunk[] }> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) return null;
  
  // Deduplicate links by URI
  const seenUris = new Set<string>();
  const uniqueItems = chunks.filter(c => {
    const uri = c.web?.uri || c.maps?.uri;
    if (!uri || seenUris.has(uri)) return false;
    seenUris.add(uri);
    return true;
  });

  if (uniqueItems.length === 0) return null;
  
  return (
    <div className="mt-4 p-5 bg-gradient-to-br from-blue-500/10 to-transparent rounded-[2rem] border border-blue-500/20 backdrop-blur-sm animate-in zoom-in-95 duration-500">
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
        Источники Grounding (Smart Sync)
      </p>
      <div className="grid grid-cols-1 gap-2">
        {uniqueItems.map((chunk, idx) => {
          const isWeb = !!chunk.web;
          const item = chunk.web || chunk.maps;
          if (!item) return null;
          return (
            <a 
              key={idx}
              href={item.uri} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-[11px] text-gray-300 hover:text-white transition-all bg-white/5 px-4 py-3 rounded-2xl border border-white/5 hover:border-blue-500/30 truncate"
            >
              <div className={`p-2 rounded-lg ${isWeb ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                {isWeb ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                )}
              </div>
              <span className="flex-1 truncate font-medium">
                {item.title || (isWeb ? 'Веб-источник' : 'Местоположение')}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity -rotate-45"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </a>
          );
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { 
    state: cameraState, 
    updateState: updateCamera, 
    reset: resetCamera, 
    generatedPrompt 
  } = useCameraControls();
  
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');
  const [activePreset, setActivePreset] = useState<CameraPreset | undefined>('default');
  const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
  const [retryTimer, setRetryTimer] = useState<number>(0);
  
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeyReady(hasKey);
      } else {
        setApiKeyReady(true);
      }
    };
    checkKey();

    // Fetch geolocation for Maps grounding if supported
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSettings(prev => ({
            ...prev,
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            }
          }));
        },
        (err) => console.log("Geolocation context unavailable:", err.message),
        { timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    if (retryTimer <= 0) return;
    const t = setInterval(() => setRetryTimer(prev => prev - 1), 1000);
    return () => clearInterval(t);
  }, [retryTimer]);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        setApiKeyReady(true);
        setError(null);
      } catch (err) {
        console.error("Key selection sequence failed", err);
      }
    } else {
      window.open('https://ai.google.dev/gemini-api/docs/billing', '_blank');
    }
  };

  const startGenerationFlow = async () => {
    if (!sourceImage || retryTimer > 0) return;

    if (settings.quality === 'pro' && !apiKeyReady) {
      await handleSelectKey();
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const { imageUrl, groundingChunks } = await geminiService.generateImage(sourceImage, generatedPrompt, settings);
      const newResult: GenerationResult = {
        id: Math.random().toString(36).substring(7),
        imageUrl: imageUrl,
        prompt: generatedPrompt,
        timestamp: Date.now(),
        settings: { ...settings },
        cameraState: { ...cameraState },
        groundingChunks: groundingChunks,
      };
      setResult(newResult);
      setHistory(prev => [newResult, ...prev]);
    } catch (err: any) {
      console.error("Spatial Engine Fault:", err);
      
      const isQuota = err.message?.includes("QUOTA_LIMIT") || err.message?.includes("429");
      const isAuth = err.message?.includes("AUTH_ERROR") || err.message?.includes("entity was not found");
      
      if (isQuota) {
        setError({ message: "Engine Quota Exceeded. Cooldown active.", type: 'quota' });
        setRetryTimer(60);
      } else if (isAuth) {
        setError({ message: "Identity Auth Failed. Reset required.", type: 'auth' });
        setApiKeyReady(false); 
      } else {
        setError({ message: err.message || "Unidentified Synthesis Error.", type: 'system' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {settings.quality === 'pro' && !apiKeyReady && (
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-8 py-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-[200] animate-in slide-in-from-top duration-500">
          <p className="text-[10px] font-bold text-blue-300 tracking-wide uppercase flex items-center gap-3">
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded shadow-[0_0_10px_rgba(59,130,246,0.5)]">Pro Engine</span>
            Spatial High-Res features require a valid Billing project key.
          </p>
          <div className="flex gap-4 items-center">
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] text-blue-400/60 hover:text-blue-400 underline uppercase font-black">Docs</a>
            <button onClick={handleSelectKey} className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase transition-all shadow-lg shadow-blue-500/20">
              Select Project Key
            </button>
          </div>
        </div>
      )}

      <div className="h-16 flex items-center px-8 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex gap-8">
          <button onClick={() => setActiveTab('3d')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            Spatial 3D
          </button>
          <button onClick={() => setActiveTab('sliders')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            Manual Sliders
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="flex flex-col gap-8">
          <div className="relative aspect-[16/10] min-h-[500px] bg-black rounded-[2.5rem] overflow-hidden border border-white/5">
            {activeTab === '3d' ? (
              <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} activePreset={activePreset} />
            ) : (
              <div className="p-10 h-full overflow-y-auto">
                <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
              </div>
            )}
            {!sourceImage && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                <ImageUploader onUpload={setSourceImage} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button onClick={resetCamera} className="bg-[#111111] border border-white/5 py-6 rounded-[2rem] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
              Reset View
            </button>
            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating || retryTimer > 0}
              className={`py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all relative overflow-hidden ${(!sourceImage || isGenerating || retryTimer > 0) ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              {retryTimer > 0 ? (
                <span className="flex items-center justify-center gap-3 italic">
                  Cooldown: {retryTimer}s
                </span>
              ) : (
                isGenerating ? 'Synthesizing...' : 'Reconstruct Perspective'
              )}
              {isGenerating && <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress w-full" />}
            </button>
          </div>

          <PromptConsole prompt={generatedPrompt} />
        </div>

        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden flex items-center justify-center group shadow-2xl">
            {result ? (
              <img src={result.imageUrl} className="w-full h-full object-cover cursor-zoom-in" alt="Result" onClick={() => setIsZoomed(true)} />
            ) : (
              <div className="text-gray-800 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Waiting for Signal</div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Calculating Geometry</p>
              </div>
            )}
          </div>
          
          <GroundingLinks chunks={result?.groundingChunks} />
          
          <PresetGallery activePreset={activePreset} onSelect={(s, id) => { updateCamera(s); setActivePreset(id); }} />
          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
        </aside>
      </main>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`p-6 rounded-[2rem] border shadow-2xl flex flex-col gap-3 ${error.type === 'auth' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-lg">{error.type === 'auth' ? '🔑' : '⚠️'}</span>
              <button onClick={() => setError(null)} className="hover:scale-125 transition-transform text-white/40">✕</button>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white">{error.message}</p>
              <p className="text-[9px] opacity-60 text-gray-300 mt-1 leading-relaxed">
                {error.type === 'quota' ? 'Free tier limits reached. Switch to Pro with a private key for continuous access.' : 
                 error.type === 'auth' ? 'The current API context is invalid or the project was decommissioned.' : 
                 'Internal synthesis error encountered in the neural engine.'}
              </p>
            </div>
            {error.type === 'auth' && (
              <button 
                onClick={handleSelectKey}
                className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase transition-all"
              >
                Re-Authenticate Session
              </button>
            )}
          </div>
        </div>
      )}

      {isZoomed && result && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 lg:p-20" onClick={() => setIsZoomed(false)}>
          <img src={result.imageUrl} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300" alt="Zoomed" />
          <button className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors text-3xl">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;