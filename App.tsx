
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

interface AppError {
  message: string;
  type: 'quota' | 'auth' | 'system';
  retryAfter?: number;
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
  const [error, setError] = useState<AppError | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');
  const [activePreset, setActivePreset] = useState<CameraPreset | undefined>('default');
  const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
  const [retryTimer, setRetryTimer] = useState<number>(0);
  
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

  // Timer for quota retry
  useEffect(() => {
    if (retryTimer > 0) {
      const t = setInterval(() => setRetryTimer(prev => prev - 1), 1000);
      return () => clearInterval(t);
    }
  }, [retryTimer]);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setApiKeyReady(true);
      setError(null);
    }
  };

  const startGenerationFlow = async () => {
    if (!sourceImage || retryTimer > 0) return;

    if (settings.quality === 'pro' && !apiKeyReady) {
      if (window.aistudio) {
        await handleSelectKey();
      } else {
        setError({ message: "Режим Pro требует платного API ключа.", type: 'auth' });
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
      console.error("Engine Fault:", err);
      
      const isQuota = err.message?.includes("429") || err.message?.includes("QUOTA") || err.message?.includes("limit");
      
      if (isQuota) {
        setError({ 
          message: "Лимит бесплатных запросов исчерпан (Quota 429).", 
          type: 'quota' 
        });
        setRetryTimer(60); // Standard wait for free tier
      } else if (err.message?.includes("entity was not found")) {
        setError({ message: "Проект не найден. Попробуйте переподключить ключ.", type: 'auth' });
        setApiKeyReady(false);
      } else {
        setError({ message: err.message || "Ошибка системы реконструкции.", type: 'system' });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-orange-500/30">
      {settings.quality === 'pro' && !apiKeyReady && (
        <div className="bg-blue-600/20 border-b border-blue-500/30 px-8 py-3 flex items-center justify-between backdrop-blur-md sticky top-0 z-[200]">
          <p className="text-[10px] font-bold text-blue-300 tracking-wide uppercase">
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded mr-3">Pro Mode</span>
            Используйте платный проект для обхода лимитов
          </p>
          <button onClick={handleSelectKey} className="bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase transition-all">
            Активировать
          </button>
        </div>
      )}

      <div className="h-16 flex items-center px-8 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex gap-8">
          <button onClick={() => setActiveTab('3d')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            3D Контроль
          </button>
          <button onClick={() => setActiveTab('sliders')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>
            Слайдеры
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
              Сброс
            </button>
            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating || retryTimer > 0}
              className={`py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all relative overflow-hidden ${(!sourceImage || isGenerating || retryTimer > 0) ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              {retryTimer > 0 ? (
                <span className="flex items-center justify-center gap-3">
                  Подождите {retryTimer}с
                </span>
              ) : (
                isGenerating ? 'Обработка...' : 'Генерация'
              )}
              {isGenerating && <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress w-full" />}
            </button>
          </div>

          <PromptConsole prompt={generatedPrompt} />
        </div>

        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden flex items-center justify-center group">
            {result ? (
              <img src={result.imageUrl} className="w-full h-full object-cover" alt="Result" onClick={() => setIsZoomed(true)} />
            ) : (
              <div className="text-gray-800 font-black uppercase text-[10px] tracking-[0.4em]">Ожидание Сигнала</div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <PresetGallery activePreset={activePreset} onSelect={(s, id) => { updateCamera(s); setActivePreset(id); }} />
          <GenerationSettingsPanel settings={settings} onChange={(u) => setSettings(s => ({...s, ...u}))} />
          <HistorySidebar history={history} onSelect={(i) => {setResult(i); updateCamera(i.cameraState);}} onClear={() => setHistory([])} />
        </aside>
      </main>

      {error && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] p-1 rounded-full animate-in slide-in-from-bottom-4 duration-500`}>
          <div className={`px-6 py-4 rounded-full border shadow-2xl flex items-center gap-4 ${error.type === 'quota' ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
            <span className="text-lg">{error.type === 'quota' ? '⚖️' : '⚠️'}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">{error.message}</span>
              {error.type === 'quota' && <span className="text-[8px] opacity-60">Бесплатный уровень Gemini ограничен. Подождите немного или смените ключ.</span>}
            </div>
            <button onClick={() => setError(null)} className="ml-4 hover:scale-125 transition-transform">✕</button>
          </div>
        </div>
      )}

      {isZoomed && result && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8 lg:p-20" onClick={() => setIsZoomed(false)}>
          <img src={result.imageUrl} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white/10" alt="Zoomed" />
        </div>
      )}
    </div>
  );
};

export default App;
