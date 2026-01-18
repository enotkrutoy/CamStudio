
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
      console.error("Failed to copy prompt");
    }
  };

  return (
    <div className="bg-black/80 rounded-xl border border-blue-500/20 p-4 font-mono text-[11px] space-y-2 overflow-hidden shadow-inner h-28 relative group">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2 text-blue-500/60 uppercase tracking-widest font-bold">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Spatial Instruction Set
        </div>
        {prompt !== "no camera movement" && (
          <button 
            onClick={copyToClipboard}
            className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase font-bold flex items-center gap-1.5"
          >
            {copied ? 'Copied' : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>
      <div className="text-gray-400 leading-relaxed overflow-y-auto h-14 scrollbar-hide pr-4">
        <span className="text-blue-400 mr-2 font-black">>></span>
        {prompt === "no camera movement" ? (
          <span className="italic text-gray-600">IDLE: Adjust 3D controls to populate buffer...</span>
        ) : (
          prompt
        )}
      </div>
      <div className="absolute right-2 bottom-2 w-1.5 h-1.5 bg-blue-500/20 rounded-full" />
    </div>
  );
};
