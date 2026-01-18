
import React, { useState, useCallback, useEffect } from 'react';
import { GenerationSettings, ImageData, GenerationResult } from './types';
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
  const [activeTab, setActiveTab] = useState<'scene' | 'controls' | 'output'>('scene');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startGenerationFlow = useCallback(async () => {
    if (!sourceImage || isGenerating) return;
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await geminiService.generateImage(sourceImage, generatedPrompt, settings, (sec) => setRetrySeconds(sec));
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
      setHistory(prev => [newResult, ...prev].slice(0, 15));
      if (isMobile) setActiveTab('output');
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        await window.aistudio?.openSelectKey();
      }
    } finally {
      setIsGenerating(false);
    }
  }, [sourceImage, isGenerating, generatedPrompt, settings, cameraState, isMobile]);

  // Desktop Layout
  const renderDesktop = () => (
    <main className="flex-1 overflow-hidden grid grid-cols-[1fr_450px] gap-px bg-white/5">
      <div className="bg-[#050505] flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar">
        <div className="relative aspect-video w-full rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} onReplace={() => setSourceImage(null)} />
          {!sourceImage && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-3xl">
              <ImageUploader onUpload={setSourceImage} />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <PresetGallery onSelect={(s) => updateCamera(s)} />
          <div className="space-y-6">
            <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
            <button 
              onClick={startGenerationFlow} 
              disabled={!sourceImage || isGenerating}
              className={`w-full py-8 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all transform active:scale-95 ${(!sourceImage || isGenerating) ? 'bg-white/5 text-gray-700' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-2xl shadow-orange-600/20'}`}
            >
              {isGenerating ? 'Synthesizing...' : 'Reconstruct Frame'}
            </button>
          </div>
        </div>

        <PromptConsole prompt={generatedPrompt} modelResponse={result?.modelResponse} isGenerating={isGenerating} groundingChunks={result?.groundingChunks} />
      </div>

      <div className="bg-[#080808] flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar border-l border-white/5">
        <div className="aspect-square w-full rounded-[3.5rem] bg-black border border-white/10 overflow-hidden shadow-2xl relative group">
          {result ? (
            <img src={result.imageUrl} className="w-full h-full object-cover" alt="Output" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
              <div className="w-16 h-px bg-orange-600 mb-4 animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Waiting for Signal</span>
            </div>
          )}
        </div>
        <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({ ...s, ...u }))} />
        <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
      </div>
    </main>
  );

  // Mobile Layout
  const renderMobile = () => (
    <main className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
      <div className="flex-1 relative overflow-y-auto pb-32">
        {activeTab === 'scene' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-square w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-xl bg-black relative">
              <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} onReplace={() => setSourceImage(null)} />
              {!sourceImage && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/95">
                  <ImageUploader onUpload={setSourceImage} />
                </div>
              )}
            </div>
            <PresetGallery onSelect={(s) => updateCamera(s)} />
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
            <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({ ...s, ...u }))} />
            <div className="bg-black/40 p-4 rounded-3xl border border-white/5">
              <p className="text-[8px] uppercase font-bold text-gray-600 mb-2">Technical Telemetry</p>
              <p className="text-[9px] font-mono text-gray-400 break-words">{generatedPrompt}</p>
            </div>
          </div>
        )}

        {activeTab === 'output' && (
          <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="aspect-square w-full rounded-[2.5rem] bg-black border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center">
              {result ? (
                <img src={result.imageUrl} className="w-full h-full object-cover" alt="Output" />
              ) : (
                <span className="text-[10px] uppercase font-black text-gray-700">Empty Buffer</span>
              )}
            </div>
            <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
          </div>
        )}
      </div>

      {/* Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-black/80 backdrop-blur-3xl border-t border-white/10 z-[100] flex flex-col gap-4">
        {activeTab !== 'output' && (
          <button 
            onClick={startGenerationFlow}
            disabled={!sourceImage || isGenerating}
            className="w-full py-5 bg-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white active:scale-95 transition-all shadow-xl shadow-orange-900/20"
          >
            {isGenerating ? 'Synthesizing...' : 'Generate New View'}
          </button>
        )}
        
        <div className="flex justify-around items-center h-12">
          {[
            { id: 'scene', label: 'Scene', icon: '🌍' },
            { id: 'controls', label: 'Controls', icon: '🎛️' },
            { id: 'output', label: 'Output', icon: '🖼️' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-orange-500 scale-110' : 'text-gray-600 opacity-60'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col selection:bg-orange-500/30 overflow-hidden">
      <header className="h-16 flex items-center justify-between px-6 lg:px-10 border-b border-white/5 bg-black/80 backdrop-blur-2xl z-[150]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-black text-sm shadow-lg shadow-orange-600/30">Q</div>
          <h1 className="text-[12px] font-black uppercase tracking-[0.4em]">QwenCam <span className="text-orange-600">Studio</span> <span className="text-gray-700">v3.0.1</span></h1>
        </div>
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-green-500 tracking-widest">NEURAL_ENGINE_OK</span>
            <span className="text-[7px] font-mono text-gray-600 uppercase">Latency: 12ms</span>
          </div>
          <div className="h-8 w-px bg-white/5" />
          <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
        </div>
      </header>

      {isMobile ? renderMobile() : renderDesktop()}
    </div>
  );
};

export default App;
