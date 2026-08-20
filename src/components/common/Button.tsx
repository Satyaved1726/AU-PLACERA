import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-bold tracking-wide uppercase rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-md shadow-primary/5 border border-primary/20',
    secondary: 'bg-secondary hover:bg-secondary-dark text-white shadow-md shadow-secondary/5 border border-secondary/20',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm',
    danger: 'bg-accent hover:bg-accent-dark text-white shadow-md shadow-accent/5 border border-accent/20',
    ghost: 'hover:bg-slate-100/70 text-slate-600',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/5 border border-emerald-700/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[9px] tracking-wider rounded-lg',
    md: 'px-4.5 py-2.5 text-[10px] tracking-wider rounded-xl',
    lg: 'px-6 py-3.5 text-xs tracking-wider rounded-xl',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
