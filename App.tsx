import React, { useState, useCallback, useEffect } from 'react';
import { GenerationSettings, ImageData, GenerationResult, CameraPreset } from './types';
import { DEFAULT_SETTINGS, DEFAULT_CAMERA_STATE } from './constants';
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
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
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

  // [FIX] Perform initial API key availability check for models requiring individual keys
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
      // [FIX] Procedural assumption: key is selected immediately to avoid race conditions per guidelines
      setApiKeyReady(true);
    }
  };

  const handlePresetSelect = (state: any, id: CameraPreset) => {
    updateCamera(state);
    setActivePreset(id);
  };

  const startGenerationFlow = async () => {
    if (!sourceImage) return;

    // [FIX] Pro quality model requires explicit API key selection by the user
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
      // [FIX] Handle 404 project errors by prompting re-selection of a paid project key
      if (err.message && err.message.includes("Requested entity was not found.")) {
        setError("SYSTEM_FAULT: API Key not found or invalid project. Please re-select key.");
        setApiKeyReady(false);
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setError(err.message || "Сбой системы реконструкции.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {/* API Key Banner for gemini-3-pro-image-preview requirements */}
      {settings.quality === 'pro' && !apiKeyReady && (
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-8 py-3 flex items-center justify-between backdrop-blur-md">
          <p className="text-xs font-bold text-blue-300 tracking-wide uppercase">
            Pro Mode требует активации API Key из платного проекта GCP
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="ml-4 underline opacity-70 hover:opacity-100">Документация</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="bg-blue-500 hover:bg-blue-400 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase transition-all"
          >
            Выбрать Ключ
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
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
        
        {/* Viewport Area */}
        <div className="flex flex-col gap-8">
          <div className="relative aspect-[16/10] min-h-[500px] bg-black rounded-[2.5rem] overflow-hidden shadow-2xl">
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
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-md p-6">
                  <ImageUploader onUpload={setSourceImage} />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
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
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden shadow-2xl flex items-center justify-center group">
            {result ? (
              <img src={result.imageUrl} className="w-full h-full object-cover" alt="Result" />
            ) : (
              <div className="text-center opacity-10">
                <svg className="mx-auto mb-6" xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><circle cx="9" cy="9" r="2"/></svg>
                <p className="text-sm font-black uppercase tracking-[0.3em]">RECONSTRUCTION_IDLE</p>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-t-2 border-orange-500 rounded-full animate-spin shadow-[0_0_20px_rgba(234,88,12,0.4)]" />
                <p className="text-[10px] font-mono font-bold text-orange-500 animate-pulse">PROCESSING_VOXELS...</p>
              </div>
            )}
            {/* [FIX] Display Google Search grounding metadata per strict policy guidelines */}
            {result?.groundingChunks && result.groundingChunks.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-2">Источники данных</p>
                <div className="flex flex-wrap gap-2">
                  {result.groundingChunks.map((chunk, idx) => chunk.web && (
                    <a 
                      key={idx} 
                      href={chunk.web.uri} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[9px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-all truncate max-w-[150px]"
                    >
                      {chunk.web.title || chunk.web.uri}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <PresetGallery activePreset={activePreset} onSelect={handlePresetSelect} />
          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
        </aside>

      </main>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
          SYSTEM_FAULT: {error}
        </div>
      )}
    </div>
  );
};

export default App;