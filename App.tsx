
import React, { useState, useEffect } from 'react';
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

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // [FIX] Make aistudio optional to match identical modifiers if declared elsewhere
    aistudio?: AIStudio;
  }
}

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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');
  const [activePreset, setActivePreset] = useState<CameraPreset | undefined>('default');
  const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
  
  const [isZoomed, setIsZoomed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');

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
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      setApiKeyReady(true);
    }
  };

  const handlePresetSelect = (state: any, id: CameraPreset) => {
    updateCamera(state);
    setActivePreset(id);
  };

  const startGenerationFlow = async () => {
    if (!sourceImage) return;

    // Check for API key if using Pro quality
    if (settings.quality === 'pro' && !apiKeyReady) {
      if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await handleSelectKey();
      } else {
        setError("API Key Selection required for Pro quality. Please use Google AI Studio.");
        return;
      }
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
      // Re-trigger key selection if project is not found (per guidelines)
      if (err.message && err.message.includes("Requested entity was not found.")) {
        setError("SYSTEM_FAULT: Project not found or invalid API Key. Please re-select a key from a paid project.");
        setApiKeyReady(false);
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setError(err.message || "Сбой системы реконструкции.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setError("Ошибка при копировании изображения.");
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `qwencam-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {settings.quality === 'pro' && !apiKeyReady && (
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-8 py-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-[200]">
          <p className="text-[10px] font-bold text-blue-300 tracking-wide uppercase">
            Pro Mode требует активации API Key из платного проекта GCP
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="ml-4 underline opacity-70 hover:opacity-100">Биллинг Документация</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase transition-all shadow-lg shadow-blue-500/20"
          >
            Выбрать Ключ
          </button>
        </div>
      )}

      <div className="h-16 flex items-center px-8 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex gap-8">
          <button 
            onClick={() => setActiveTab('3d')}
            className={`flex items-center gap-2.5 pb-5 border-b-2 transition-all font-bold text-sm tracking-tight ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <span className="text-lg">🎮</span> 3D Camera Control
          </button>
          <button 
            onClick={() => setActiveTab('sliders')}
            className={`flex items-center gap-2.5 pb-5 border-b-2 transition-all font-bold text-sm tracking-tight ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <span className="text-lg">🎚️</span> Slider Controls
          </button>
        </div>
      </div>

      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        
        <div className="flex flex-col gap-8">
          <div className="relative aspect-[16/10] min-h-[500px] bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
            {activeTab === '3d' ? (
              <Camera3DControl 
                state={cameraState} 
                sourceImage={sourceImage} 
                onChange={updateCamera} 
                activePreset={activePreset}
              />
            ) : (
              <div className="p-10 h-full overflow-y-auto custom-scrollbar">
                <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
              </div>
            )}
            
            {!sourceImage && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
                <div className="w-full max-w-md p-6">
                  <ImageUploader onUpload={setSourceImage} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => { resetCamera(); setActivePreset('default'); }}
              className="bg-[#111111] border border-white/5 py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-white/5 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover:rotate-180 transition-transform duration-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
              </div>
              <span className="text-lg font-black uppercase tracking-widest text-gray-300">Reset</span>
            </button>

            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating}
              className={`py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all active:scale-[0.98] group shadow-2xl ${(!sourceImage || isGenerating) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12z"/><path d="M12 15v5s1-.5 4-1c0-1.5-.5-3-.5-3L12 15z"/></svg>
              </div>
              <span className="text-lg font-black uppercase tracking-widest">
                {isGenerating ? 'Synthesizing...' : 'Generate'}
              </span>
            </button>
          </div>

          <PromptConsole prompt={generatedPrompt} />

          {result?.groundingChunks && result.groundingChunks.length > 0 && (
            <div className="bg-black/40 rounded-3xl border border-white/5 p-6 backdrop-blur-md">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Источники и Обоснование (Grounding)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.groundingChunks.map((chunk, idx) => (
                  chunk.web && (
                    <a 
                      key={idx}
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-300 truncate">{chunk.web.title || "External Source"}</p>
                        <p className="text-[8px] text-gray-500 truncate font-mono">{chunk.web.uri}</p>
                      </div>
                    </a>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center group">
            {result ? (
              <>
                <img 
                  src={result.imageUrl} 
                  className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105" 
                  alt="Result" 
                  onClick={() => setIsZoomed(true)}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8 gap-4">
                  <button 
                    onClick={() => copyImageToClipboard(result.imageUrl)}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-orange-500 transition-all active:scale-90 shadow-lg"
                    title="Копировать в буфер"
                  >
                    {copyStatus === 'success' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                  <button 
                    onClick={() => downloadImage(result.imageUrl)}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-orange-500 transition-all active:scale-90 shadow-lg"
                    title="Скачать результат"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                  <button 
                    onClick={() => setIsZoomed(true)}
                    className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center hover:bg-orange-500 transition-all active:scale-90 shadow-lg"
                    title="Развернуть"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center opacity-10">
                <svg className="mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><circle cx="9" cy="9" r="2"/></svg>
                <p className="text-sm font-black uppercase tracking-[0.3em]">RECONSTRUCTION_IDLE</p>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <div className="w-12 h-12 border-t-2 border-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(234,88,12,0.4)]" />
                <p className="text-[10px] font-mono font-bold text-orange-500 animate-pulse uppercase tracking-widest">Processing Voxels...</p>
              </div>
            )}
          </div>

          <PresetGallery activePreset={activePreset} onSelect={handlePresetSelect} />
          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
        </aside>

      </main>

      {isZoomed && result && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-300"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-full max-h-full flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
            <img 
              src={result.imageUrl} 
              className="max-h-[80vh] w-auto rounded-[2.5rem] shadow-[0_0_150px_rgba(0,0,0,0.8)] border border-white/10 object-contain"
              alt="Zoomed Reconstruction"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => copyImageToClipboard(result.imageUrl)}
                className="bg-white/10 hover:bg-white/20 border border-white/10 px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all"
              >
                {copyStatus === 'success' ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button 
                onClick={() => downloadImage(result.imageUrl)}
                className="bg-orange-600 hover:bg-orange-500 px-8 py-4 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20"
              >
                Download PNG
              </button>
              <button 
                onClick={() => setIsZoomed(false)}
                className="bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500 flex items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button onClick={() => setError(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
