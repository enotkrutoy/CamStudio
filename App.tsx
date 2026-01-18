
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
  const [error, setError] = useState<{message: string, type: 'critical' | 'warning' | 'key' | 'safety' | 'quota'} | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');
  
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

  const copyImageToClipboard = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      setCopyStatus('idle');
    }
  };

  const downloadImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!result?.imageUrl) return;
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `qwencam-export-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startGenerationFlow = useCallback(async () => {
    if (!sourceImage || isGenerating) return;
    setIsGenerating(true);
    setError(null);
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
      };
      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 20));
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        await window.aistudio?.openSelectKey();
      } else {
        setError({ message: err.message || "Synthesizer engine error.", type: 'critical' });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [sourceImage, isGenerating, generatedPrompt, settings, cameraState]);

  return (
    <div className="h-screen w-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-orange-500/30 overflow-hidden">
      {isZoomed && result?.imageUrl && (
        <div className="fixed inset-0 z-[1000] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-300 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <img src={result.imageUrl} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" alt="Zoom" />
        </div>
      )}

      <header className="h-14 flex items-center justify-between px-8 border-b border-white/5 bg-black/60 backdrop-blur-xl flex-shrink-0 z-[100]">
        <div className="flex gap-8 h-full">
          <button onClick={() => setActiveTab('3d')} className={`h-full border-b-2 transition-all font-black text-[9px] uppercase tracking-[0.2em] ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            Neural Engine
          </button>
          <button onClick={() => setActiveTab('sliders')} className={`h-full border-b-2 transition-all font-black text-[9px] uppercase tracking-[0.2em] ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            Manual Overrides
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[8px] font-mono text-gray-500 tracking-widest uppercase">Kernel: v3.1.2</span>
          <div className="w-6 h-6 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-[10px]">Q3</div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-px bg-white/5">
        <div className="bg-[#020202] flex flex-col p-6 gap-6 overflow-y-auto custom-scrollbar">
          <div className="relative aspect-video w-full bg-black rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl flex-shrink-0">
            {activeTab === '3d' ? (
              <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} onReplace={() => setSourceImage(null)} />
            ) : (
              <div className="p-10 h-full overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#080808] to-black">
                <CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} />
              </div>
            )}
            {!sourceImage && (
              <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
                <ImageUploader onUpload={setSourceImage} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 flex-shrink-0">
            <button onClick={() => setSourceImage(null)} disabled={!sourceImage || isGenerating} className="py-5 bg-white/2 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all active:scale-95 disabled:opacity-20">Clear</button>
            <button onClick={resetCamera} disabled={!sourceImage || isGenerating} className="py-5 bg-white/2 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all active:scale-95 disabled:opacity-20">Reset Cam</button>
            <button onClick={startGenerationFlow} disabled={!sourceImage || isGenerating} className={`py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${(!sourceImage || isGenerating) ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 text-white shadow-xl shadow-orange-900/20 hover:bg-orange-500'}`}>
              {retrySeconds > 0 ? `Wait ${retrySeconds}s` : (isGenerating ? 'Rendering...' : 'Execute Synthesis')}
            </button>
          </div>

          <div className="flex-1 min-h-[300px]">
             <PromptConsole prompt={generatedPrompt} modelResponse={result?.modelResponse} isGenerating={isGenerating} />
          </div>
        </div>

        <div className="bg-[#040404] flex flex-col p-6 gap-8 overflow-y-auto custom-scrollbar">
          <div className="relative aspect-square w-full rounded-[3rem] bg-[#080808] border border-white/5 overflow-hidden flex items-center justify-center shadow-2xl group flex-shrink-0">
            {result ? (
              <div className="w-full h-full relative cursor-zoom-in" onClick={() => setIsZoomed(true)}>
                <img src={isComparing ? sourceImage?.base64 : (result.imageUrl || '')} className="w-full h-full object-cover" alt="Result" />
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all">
                  <div className="flex gap-2">
                    <button onClick={copyImageToClipboard} className="w-10 h-10 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-all">❐</button>
                    <button onClick={downloadImage} className="w-10 h-10 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 transition-all">↓</button>
                  </div>
                  <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} className="h-10 px-4 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-300 hover:text-white hover:bg-orange-500 transition-all">Compare</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 opacity-20">
                <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Wait for Feed</span>
              </div>
            )}
          </div>
          
          <div className="space-y-8 flex-1">
            <PresetGallery onSelect={(s) => updateCamera(s)} />
            <GenerationSettingsPanel settings={settings} onChange={handleSettingsUpdate} />
            <HistorySidebar history={history} onSelect={setResult} onClear={() => setHistory([])} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
