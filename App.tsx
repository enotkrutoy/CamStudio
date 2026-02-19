
import React, { useState, useCallback, useEffect } from 'react';
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
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'scene' | 'controls' | 'output'>('scene');
  const [activePreset, setActivePreset] = useState<CameraPreset>('default');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkApiKeyRequirement = async () => {
    if (settings.quality === 'pro') {
      const hasKey = await window.aistudio?.hasSelectedApiKey();
      if (!hasKey) {
        setShowKeyModal(true);
        return false;
      }
    }
    return true;
  };

  const startGenerationFlow = useCallback(async () => {
    if (!sourceImage || isGenerating) return;
    
    setError(null);
    const canProceed = await checkApiKeyRequirement();
    if (!canProceed) return;

    setIsGenerating(true);

    try {
      const response = await geminiService.generateImage(sourceImage, generatedPrompt, settings);
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
      setHistory(prev => [newResult, ...prev].slice(0, 10));
      if (isMobile) setActiveTab('output');
    } catch (err: unknown) {
      console.error("Generation failed:", err);
      if (err instanceof Error && err.message === "AUTH_REQUIRED") {
        await window.aistudio?.openSelectKey();
      } else {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Generation Error: ${errorMessage}. Check connectivity or API quota.`);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [sourceImage, isGenerating, generatedPrompt, settings, cameraState, isMobile]);

  const handleOpenKeySelector = async () => {
    await window.aistudio?.openSelectKey();
    setShowKeyModal(false);
  };

  const renderDesktop = () => (
    <main className="flex-1 grid grid-cols-[1fr_420px] overflow-hidden">
      {/* Workspace */}
      <div className="bg-[#050505] p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500">Spatial Workspace v3.2</h2>
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('scene')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'scene' ? 'bg-orange-600/10 text-orange-500' : 'text-gray-600 hover:text-gray-300'}`}>3D Control</button>
                <button onClick={() => setActiveTab('controls')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'controls' ? 'bg-orange-600/10 text-orange-500' : 'text-gray-600 hover:text-gray-300'}`}>Telemetry</button>
            </div>
        </div>

        <div className="relative aspect-video w-full">
            <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} activePreset={activePreset} />
            {!sourceImage && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl rounded-[2rem]">
                <ImageUploader onUpload={setSourceImage} />
              </div>
            )}
        </div>

        <div className="grid grid-cols-2 gap-8">
            <PresetGallery activePreset={activePreset} onSelect={(s, id) => { updateCamera(s); setActivePreset(id); }} />
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={resetCamera} className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">Reset Sync</button>
                    <div className="relative w-full">
                      <button 
                          onClick={startGenerationFlow} 
                          disabled={!sourceImage || isGenerating}
                          className="w-full h-full py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                          {isGenerating ? 'Rendering...' : 'Execute View'}
                      </button>
                    </div>
                </div>
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] text-red-500 font-mono">{error}</p>
                  </div>
                )}
                <PromptConsole prompt={generatedPrompt} modelResponse={result?.modelResponse} isGenerating={isGenerating} groundingChunks={result?.groundingChunks} />
            </div>
        </div>
      </div>

      {/* Output & Sidebar */}
      <div className="bg-[#080808] border-l border-white/5 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
        <section>
          <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">Signal Output</h3>
          <div className="aspect-square w-full rounded-[2.5rem] bg-black border border-white/5 overflow-hidden shadow-2xl relative">
            {result ? (
              <img src={result.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-700" alt="Output" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <span className="text-[10px] uppercase font-black tracking-widest">Offline Buffer</span>
              </div>
            )}
            {isGenerating && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
                </div>
            )}
          </div>
        </section>
        <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({ ...s, ...u }))} />
        <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
      </div>
    </main>
  );

  const renderMobile = () => (
    <main className="flex-1 flex flex-col bg-[#050505] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-6">
        {activeTab === 'scene' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="aspect-square w-full relative">
                <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} activePreset={activePreset} />
                {!sourceImage && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 rounded-[2rem] p-6">
                    <ImageUploader onUpload={setSourceImage} />
                  </div>
                )}
            </div>
            <PresetGallery activePreset={activePreset} onSelect={(s, id) => { updateCamera(s); setActivePreset(id); }} />
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
            <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({ ...s, ...u }))} />
          </div>
        )}

        {activeTab === 'output' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="aspect-square w-full rounded-[2.5rem] bg-black border border-white/5 overflow-hidden shadow-2xl relative">
                {result ? (
                  <img src={result.imageUrl} className="w-full h-full object-cover" alt="Output" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <span className="text-[10px] uppercase font-black">Empty Result</span>
                  </div>
                )}
            </div>
            <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
          </div>
        )}
      </div>

      {/* Mobile Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-3xl border-t border-white/5 p-4 z-[100] flex flex-col gap-4">
        {activeTab !== 'output' && (
            <button 
                onClick={startGenerationFlow}
                disabled={!sourceImage || isGenerating}
                className="w-full py-4 bg-orange-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-900/20 active:scale-95"
            >
                {isGenerating ? 'Rendering Signal...' : 'Render Perspectives'}
            </button>
        )}
        <div className="flex justify-around items-center h-14">
            {[
                { id: 'scene', label: 'View', icon: '🎮' },
                { id: 'controls', label: 'Gear', icon: '⚙️' },
                { id: 'output', label: 'Gallery', icon: '🖼️' }
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'text-orange-500 scale-110' : 'text-gray-600'}`}
                >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
            ))}
        </div>
      </div>
    </main>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden font-inter text-white">
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/80 backdrop-blur-xl z-[150]">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black">Q</div>
            <h1 className="text-[11px] font-black uppercase tracking-[0.5em]">QwenCam <span className="text-orange-600">v3.2</span></h1>
        </div>
        <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Latency: 14ms</span>
                <span className="text-[7px] text-gray-600 font-mono">Sync: PERSISTENT</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
        </div>
      </header>
      
      {isMobile ? renderMobile() : renderDesktop()}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <div className="relative bg-[#111] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black uppercase tracking-widest text-orange-500 mb-4">API Key Required</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              To use High-Res Pro models (Gemini 3), you must provide your own API key with billing enabled.
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 ml-1 underline">Billing Docs</a>
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleOpenKeySelector}
                className="w-full py-4 bg-orange-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]"
              >
                Select API Key
              </button>
              <button 
                onClick={() => { setShowKeyModal(false); setSettings(s => ({ ...s, quality: 'flash' })); }}
                className="w-full py-4 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
              >
                Switch to Flash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
