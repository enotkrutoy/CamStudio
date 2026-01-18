import React, { useState, useRef } from 'react';
import { ImageData } from '../types';

interface Props {
  onUpload: (data: ImageData) => void;
}

export const ImageUploader: React.FC<Props> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, загрузите файл изображения.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      onUpload({
        base64,
        mimeType: file.type,
        name: file.name,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-[2rem] p-8 lg:p-12 transition-all cursor-pointer text-center group
        ${isDragging ? 'border-orange-500 bg-orange-500/5 shadow-[0_0_50px_rgba(249,115,22,0.1)]' : 'border-white/5 hover:border-orange-500/30 bg-white/2'}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        className="hidden"
        accept="image/*"
      />
      
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-orange-500 group-hover:bg-orange-500/10 transition-all duration-500 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" y1="5" x2="22" y2="5"/><line x1="19" y1="2" x2="19" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
        <div className="space-y-2">
          <p className="text-gray-200 font-bold text-sm lg:text-lg tracking-tight">Загрузите базовый портрет</p>
          <p className="text-gray-500 text-[10px] lg:text-xs font-medium uppercase tracking-widest">JPEG, PNG, WebP (до 10МБ)</p>
        </div>
      </div>
    </div>
  );
};