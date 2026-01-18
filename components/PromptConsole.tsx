import React, { useState } from 'react';

interface Props {
  prompt: string;
}

export const PromptConsole: React.FC<Props> = ({ prompt }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Не удалось скопировать");
    }
  };

  return (
    <div className="bg-black/80 rounded-2xl border border-blue-500/20 p-5 font-mono text-[11px] space-y-3 overflow-hidden shadow-inner h-32 relative group">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2.5 text-blue-500/60 uppercase tracking-[0.2em] font-black">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          Набор Пространственных Инструкций
        </div>
        {prompt !== "no camera movement" && (
          <button 
            onClick={copyToClipboard}
            className="text-[9px] text-gray-500 hover:text-white transition-all uppercase font-black flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-md border border-white/5"
          >
            {copied ? 'ГОТОВО' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                КОПИРОВАТЬ
              </>
            )}
          </button>
        )}
      </div>
      <div className="text-gray-400 leading-relaxed overflow-y-auto h-16 scrollbar-hide pr-4 select-all">
        <span className="text-blue-400 mr-2 font-black">&gt;&gt;</span>
        {prompt === "no camera movement" ? (
          <span className="italic text-gray-600">ОЖИДАНИЕ: Измените положение 3D камеры для формирования буфера...</span>
        ) : (
          prompt
        )}
      </div>
      <div className="absolute right-3 bottom-3 w-1.5 h-1.5 bg-blue-500/20 rounded-full" />
    </div>
  );
};