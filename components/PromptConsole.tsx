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
    <div className="bg-black/80 rounded-[2rem] border border-orange-500/20 p-6 font-mono text-[11px] space-y-4 overflow-hidden shadow-inner h-full relative group">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 text-orange-500/60 uppercase tracking-[0.2em] font-black">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          Мониторинг Пространственного ИИ
        </div>
        {prompt !== "no camera movement" && (
          <button 
            onClick={copyToClipboard}
            className="text-[9px] text-gray-500 hover:text-white transition-all uppercase font-black flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5"
          >
            {copied ? 'Скопировано' : 'Копировать Логи'}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-6 text-gray-500 border-t border-white/5 pt-4">
        <div className="space-y-2">
          <p className="text-[9px] font-black text-gray-700 uppercase">Статус Анализа</p>
          <div className="p-2.5 bg-white/2 rounded-xl border border-white/5 space-y-1">
            <p className="text-green-500/80 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-green-500" />
              ID_LOCK: АКТИВЕН
            </p>
            <p className="text-blue-500/80 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              FACTS: ПРОВЕРЕНО
            </p>
          </div>
        </div>
        <div className="text-gray-400 leading-relaxed overflow-y-auto max-h-[120px] scrollbar-hide pr-4 select-all selection:bg-orange-500/30">
          <span className="text-orange-500 mr-2 font-black">ENGINE_LOG://</span>
          {prompt === "no camera movement" ? (
            <span className="italic text-gray-600">Ожидание пространственных данных для активации 'CRITICAL IDENTITY LOCK'...</span>
          ) : (
            prompt
          )}
        </div>
      </div>
      
      <div className="absolute right-6 bottom-6 w-1.5 h-1.5 bg-orange-500/20 rounded-full" />
    </div>
  );
};