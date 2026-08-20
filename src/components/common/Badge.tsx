import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  const styles = {
    primary: 'bg-primary/5 text-primary border-primary/20',
    secondary: 'bg-secondary/5 text-secondary border-secondary/20',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-150',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-600 border-red-150',
    neutral: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
