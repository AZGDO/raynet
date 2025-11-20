import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeBlockProps {
  label: string;
  value: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (val: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  label, 
  value, 
  readOnly = false, 
  placeholder,
  onChange 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="w-full font-mono text-sm group">
      <div className="flex justify-between items-end mb-2">
        <label className="text-xs uppercase tracking-widest text-red-500/70 flex items-center gap-2">
          <Terminal size={12} />
          {label}
        </label>
        {readOnly && (
          <button 
            onClick={handleCopy}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'COPIED' : 'COPY_BUFFER'}
          </button>
        )}
      </div>
      
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className={`
            w-full bg-black/50 border border-slate-800 p-4 h-32 text-xs
            focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-900/20
            scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-black
            transition-all duration-300
            ${readOnly ? 'text-red-400/80 cursor-text' : 'text-slate-200'}
            resize-none
          `}
        />
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 w-2 h-[1px] bg-red-500/50" />
        <div className="absolute top-0 right-0 w-2 h-[1px] bg-red-500/50" />
        <div className="absolute bottom-0 left-0 w-2 h-[1px] bg-red-500/50" />
        <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-red-500/50" />
      </div>
    </div>
  );
};