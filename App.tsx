
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
  const [error, setError] = useState<{ message: string; type: 'quota' | 'auth' | 'system' } | null>(null);
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
      setApiKeyReady(true);
      setError(null);
    }
  };

  const handlePresetSelect = (state: any, id: CameraPreset) => {
    updateCamera(state);
    setActivePreset(id);
  };

  const startGenerationFlow = async () => {
    if (!sourceImage) return;

    if (settings.quality === 'pro' && !apiKeyReady) {
      if (window.aistudio) {
        await handleSelectKey();
      } else {
        setError({ message: "Для режима Pro требуется выбор API-ключа в Google AI Studio.", type: 'auth' });
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
      console.error(err);
      if (err.message?.includes("429") || err.message?.includes("QUOTA_EXCEEDED")) {
        setError({ 
          message: "Лимит бесплатных запросов исчерпан. Подождите 60 секунд или используйте платный Pro-ключ.", 
          type: 'quota' 
        });
      } else if (err.message?.includes("Requested entity was not found.")) {
        setError({ message: "Проект не найден. Пожалуйста, выберите корректный ключ.", type: 'auth' });
        setApiKeyReady(false);
      } else {
        setError({ message: err.message || "Ошибка системы реконструкции.", type: 'system' });
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
      setError({ message: "Ошибка при копировании изображения.", type: 'system' });
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
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded mr-3">PRO MODE</span>
            Требуется активация API Key из платного проекта GCP
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
            <span className="text-lg">🎮</span> 3D Control
          </button>
          <button 
            onClick={() => setActiveTab('sliders')}
            className={`flex items-center gap-2.5 pb-5 border-b-2 transition-all font-bold text-sm tracking-tight ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            <span className="text-lg">🎚️</span> Sliders
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
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="w-full max-w-md p-6">
                  <ImageUploader onUpload={setSourceImage} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => { resetCamera(); setActivePreset('default'); }}
              className="bg-[#111111] border border-white/5 py-6 rounded-[2rem] flex items-center justify-center gap-4 hover:bg-white/5 transition-all"
            >
              <span className="text-lg">🔄</span>
              <span className="text-lg font-black uppercase tracking-widest text-gray-300">Reset</span>
            </button>

            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating}
              className={`py-6 rounded-[2rem] flex items-center justify-center gap-4 transition-all ${(!sourceImage || isGenerating) ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              <span className="text-lg">{isGenerating ? '⏳' : '🚀'}</span>
              <span className="text-lg font-black uppercase tracking-widest">
                {isGenerating ? 'Synthesizing...' : 'Generate'}
              </span>
            </button>
          </div>

          <PromptConsole prompt={generatedPrompt} />
        </div>

        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden flex items-center justify-center group shadow-2xl">
            {result ? (
              <img src={result.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Result" onClick={() => setIsZoomed(true)} />
            ) : (
              <div className="text-center opacity-10">
                <p className="text-sm font-black uppercase tracking-[0.3em]">IDLE_VIEW</p>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-t-2 border-orange-500 rounded-full animate-spin" />
                <p className="text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest">Processing...</p>
              </div>
            )}
          </div>

          <PresetGallery activePreset={activePreset} onSelect={handlePresetSelect} />
          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
        </aside>
      </main>

      {error && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] px-8 py-5 rounded-[2rem] font-bold uppercase text-[11px] tracking-widest shadow-2xl flex items-center gap-4 border animate-in slide-in-from-bottom-5 ${error.type === 'quota' ? 'bg-orange-950/90 text-orange-400 border-orange-500/30' : 'bg-red-950/90 text-red-400 border-red-500/30'}`}>
          <span className="text-xl">{error.type === 'quota' ? '⚠️' : '❌'}</span>
          <div className="flex flex-col">
            <span>{error.message}</span>
            {error.type === 'quota' && <span className="text-[8px] opacity-60 mt-1">Free Tier: ~15 requests/min. Подождите немного.</span>}
          </div>
          <button onClick={() => setError(null)} className="ml-4 opacity-40 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
