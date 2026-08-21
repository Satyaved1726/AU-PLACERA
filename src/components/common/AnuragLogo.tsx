import React from 'react';

interface AnuragLogoProps {
  className?: string;
  height?: number | string;
  showText?: boolean;
  light?: boolean;
}

export const AnuragLogo: React.FC<AnuragLogoProps> = ({
  className = '',
  height = 40,
  showText = true,
  light = false
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* App Logo Image with Graduation Hat */}
      <img
        src="/app_icon.png"
        alt="AU Placera"
        style={{ height }}
        className="shrink-0 object-contain rounded-lg"
      />
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span className={`font-black tracking-wider text-[18px] ${light ? 'text-white' : 'text-[#0B3C5D]'}`}>
            AU PLACERA
          </span>
          <span className={`text-[8px] font-bold tracking-[0.27em] mt-0.5 ${light ? 'text-slate-300' : 'text-slate-500'}`}>
            ANURAG UNIVERSITY
          </span>
        </div>
      )}
    </div>
  );
};

export default AnuragLogo;
