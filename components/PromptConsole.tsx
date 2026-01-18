
import React, { useState } from 'react';

interface Props {
  prompt: string;
  modelResponse?: string;
  isGenerating?: boolean;
}

export const PromptConsole: React.FC<Props> = ({ prompt, modelResponse, isGenerating }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      const textToCopy = modelResponse ? `${prompt}\n\nANALYSIS:\n${modelResponse}` : prompt;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to capture log buffer");
    }
  };

  return (
    <div className="bg-black/80 rounded-[2.5rem] border border-orange-500/20 p-8 font-mono text-[11px] space-y-6 overflow-hidden shadow-2xl h-full relative group">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full bg-orange-500 ${isGenerating ? 'animate-ping' : ''}`} />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-orange-500/50 blur-[2px]" />
          </div>
          <div className="flex flex-col">
            <span className="text-orange-500 font-black uppercase tracking-[0.3em] text-[9px]">AI Spatial Monitor</span>
            <span className="text-gray-600 text-[8px] font-bold uppercase tracking-widest">Kernel Core V12.5.0-STABLE</span>
          </div>
        </div>
        
        {prompt !== "no camera movement" && (
          <button 
            onClick={copyToClipboard}
            className="text-[9px] text-gray-500 hover:text-orange-400 transition-all uppercase font-black flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 active:scale-95"
          >
            {copied ? 'Captured to Clipboard' : 'Export Logs'}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-8 border-t border-white/5 pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest">System Metrics</p>
            <div className="p-3 bg-white/2 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-[8px]">ID_LOCK</span>
                <span className={`text-[8px] font-black ${isGenerating ? 'text-orange-500 animate-pulse' : 'text-green-500'}`}>
                  {isGenerating ? 'LOCKING...' : 'CRITICAL'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-[8px]">LATENCY</span>
                <span className="text-blue-500 text-[8px] font-black">14ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-[8px]">SYNC</span>
                <span className="text-blue-500 text-[8px] font-black">OK</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 leading-relaxed overflow-y-auto max-h-[160px] pr-4 custom-scrollbar select-text">
          <div className="relative pl-6 border-l border-orange-500/30">
            <span className="absolute left-0 top-0 text-orange-500 font-black -translate-x-1/2 bg-black px-1">TX</span>
            <p className="text-gray-400 text-[10px] selection:bg-orange-500/30">
              {prompt === "no camera movement" ? (
                <span className="italic text-gray-700">Waiting for spatial telemetry to initialize...</span>
              ) : (
                prompt
              )}
            </p>
          </div>
          
          {(modelResponse || isGenerating) && (
            <div className="relative pl-6 border-l border-blue-500/30 animate-in fade-in slide-in-from-top-2 duration-700">
              <span className="absolute left-0 top-0 text-blue-500 font-black -translate-x-1/2 bg-black px-1">RX</span>
              {isGenerating ? (
                <div className="flex flex-col gap-1">
                  <span className="animate-pulse text-gray-600 italic">Decoding neural stream...</span>
                  <div className="h-1 w-24 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-progress" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-blue-400 font-black text-[9px] uppercase tracking-widest">Visual Analysis Report:</p>
                  <p className="text-gray-300 text-[10px] leading-relaxed selection:bg-blue-500/30 whitespace-pre-wrap">
                    {modelResponse}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute right-8 bottom-8 flex gap-1">
        <div className="w-1 h-1 bg-orange-500/20 rounded-full" />
        <div className="w-1 h-1 bg-orange-500/40 rounded-full" />
        <div className="w-1 h-1 bg-orange-500/20 rounded-full" />
      </div>
    </div>
  );
};
