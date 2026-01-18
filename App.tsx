
import React, { useState, useEffect, useCallback } from 'react';
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
    // Fixed: Added 'readonly' modifier to match environment declaration and fix modifier conflict.
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const { state: cameraState, updateState: updateCamera, reset: resetCamera, generatedPrompt } = useCameraControls();
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [sourceImage, setSourceImage] = useState<ImageData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<{message: string, type: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'3d' | 'sliders'>('3d');

  const handleSettingsUpdate = useCallback(async (updates: Partial<GenerationSettings>) => {
    if (updates.quality === 'pro') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }
    setSettings(s => ({ ...s, ...updates }));
  }, []);

  const startGenerationFlow = useCallback(async () => {
    if (!sourceImage || isGenerating) return;

    // Additional check to ensure API key is selected when using high-quality models.
    if (settings.quality === 'pro') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceed as per instructions: assume key selection was successful after triggering dialog.
      }
    }

    setIsGenerating(true);
    setError(null);
    setRetrySeconds(0);

    try {
      const { imageUrl, modelResponse, groundingChunks } = await geminiService.generateImage(
        sourceImage, 
        generatedPrompt, 
        settings,
        (sec) => setRetrySeconds(sec)
      );

      const newResult: GenerationResult = {
        id: Math.random().toString(36).substring(7),
        imageUrl,
        prompt: generatedPrompt,
        modelResponse,
        timestamp: Date.now(),
        settings: { ...settings },
        cameraState: { ...cameraState },
        groundingChunks,
      };

      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 20));
    } catch (err: any) {
      const isQuota = err.message?.includes("QUOTA") || err.message?.includes("429");
      const isNotFound = err.message?.includes("Requested entity was not found");
      const isSafety = err.message?.includes("SAFETY") || err.message?.includes("finishReason: SAFETY");
      
      if (isNotFound) {
        setError({ message: "Ошибка ключа доступа. Пожалуйста, выберите ключ заново.", type: 'key' });
        await window.aistudio.openSelectKey();
      } else if (isSafety) {
        setError({ message: "Блокировка системы безопасности: обнаружены критические изменения лица.", type: 'safety' });
      } else {
        setError({
          message: isQuota ? "Сервер перегружен. Лимит запросов исчерпан." : "Ошибка синтеза ракурса.",
          type: isQuota ? 'quota' : 'system'
        });
      }
    } finally {
      setIsGenerating(false);
      setRetrySeconds(0);
    }
  }, [sourceImage, isGenerating, generatedPrompt, settings, cameraState]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      <div className="h-16 flex items-center px-8 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="flex gap-8">
          <button onClick={() => setActiveTab('3d')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === '3d' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>Spatial 3D</button>
          <button onClick={() => setActiveTab('sliders')} className={`pb-5 border-b-2 transition-all font-bold text-sm ${activeTab === 'sliders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500'}`}>Sliders</button>
        </div>
      </div>

      <main className="flex-1 p-6 lg:p-10 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
        <div className="flex flex-col gap-8">
          <div className="relative aspect-[16/10] min-h-[500px] bg-black rounded-[2.5rem] overflow-hidden border border-white/5 shadow-inner">
            {activeTab === '3d' ? (
              <Camera3DControl state={cameraState} sourceImage={sourceImage} onChange={updateCamera} />
            ) : (
              <div className="p-10 h-full overflow-y-auto"><CameraSliders state={cameraState} onChange={updateCamera} onReset={resetCamera} /></div>
            )}
            {!sourceImage && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                <ImageUploader onUpload={setSourceImage} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <button onClick={resetCamera} className="bg-[#111111] border border-white/5 py-6 rounded-[2rem] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">Reset View</button>
            <button 
              onClick={startGenerationFlow}
              disabled={!sourceImage || isGenerating}
              className={`py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all relative overflow-hidden ${(!sourceImage || isGenerating) ? 'bg-gray-800 text-gray-600' : 'bg-orange-600 text-white hover:bg-orange-500'}`}
            >
              {retrySeconds > 0 ? `Retry in ${retrySeconds}s...` : (isGenerating ? 'Synthesizing...' : 'Reconstruct Perspective')}
              {isGenerating && <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress w-full" />}
            </button>
          </div>
          <PromptConsole 
            prompt={generatedPrompt} 
            modelResponse={result?.modelResponse} 
            isGenerating={isGenerating} 
          />
        </div>

        <aside className="flex flex-col gap-8">
          <div className="relative aspect-square rounded-[3rem] bg-black border border-white/5 overflow-hidden flex items-center justify-center group shadow-2xl">
            {result ? (
              <div className="w-full h-full relative">
                <img src={result.imageUrl} className="w-full h-full object-cover" alt="Result" />
                {result.groundingChunks && result.groundingChunks.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 max-h-[120px] overflow-y-auto">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Sources:</p>
                    <div className="flex flex-col gap-1">
                      {result.groundingChunks.map((chunk, idx) => (
                        chunk.web && (
                          <a 
                            key={idx} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-blue-400 hover:underline truncate"
                          >
                            {chunk.web.title || chunk.web.uri}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-800 font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Waiting for Signal</div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest text-center">
                  {retrySeconds > 0 ? `Квота превышена. Ждем ${retrySeconds}с...` : 'Синтез изображения...'}
                </p>
              </div>
            )}
          </div>
          <PresetGallery onSelect={(s) => { updateCamera(s); }} />
          <GenerationSettingsPanel settings={settings} onChange={handleSettingsUpdate} />
          <HistorySidebar history={history} onSelect={(res) => { setResult(res); }} onClear={() => { setHistory([]); }} />
        </aside>
      </main>

      {error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] w-full max-w-md px-4">
          <div className={`p-6 rounded-[2rem] border shadow-2xl bg-red-500/10 border-red-500/50 flex justify-between items-center backdrop-blur-xl`}>
            <p className="text-[11px] font-black uppercase tracking-widest text-white">{error.message}</p>
            <button onClick={() => setError(null)} className="text-white/40 hover:text-white ml-4">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
