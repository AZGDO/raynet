import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TerminalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

export const TerminalButton: React.FC<TerminalButtonProps> = ({ 
  children, 
  icon: Icon, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "group relative font-mono uppercase tracking-wider px-6 py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 clip-path-polygon";
  
  const variants = {
    primary: "bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-500/50 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    secondary: "bg-slate-900/50 hover:bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500",
    danger: "bg-red-950 hover:bg-red-900 text-red-600 border border-red-900 hover:border-red-700"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon size={18} className="transition-transform group-hover:scale-110" />}
      <span>{children}</span>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-1 h-1 bg-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-1 h-1 bg-current opacity-50" />
    </button>
  );
};