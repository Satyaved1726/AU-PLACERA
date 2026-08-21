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
  const navyColor = light ? '#FFFFFF' : '#0B3C5D';
  const redColor = '#A91D22';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Monogram A+U vector drawing */}
      <svg
        height={height}
        viewBox="0 0 100 100"
        className="shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height }}
      >
        {/* Red "U" Shape */}
        <path
          d="M15,15 H32 V58 C32 67.5 39.5 75 49 75 C58.5 75 66 67.5 66 58 V15 H83 V58 C83 76.5 68 91.5 49 91.5 C30 91.5 15 76.5 15 58 Z"
          fill={redColor}
        />
        {/* Navy Blue / White "A" Shape overlaying and intersecting */}
        <path
          d="M49,7 L18,88 H35 L42,68 H56 L63,88 H80 Z M49,27 L53,49 H45 Z"
          fill={navyColor}
          stroke={light ? '#0B3C5D' : '#F8FAFC'}
          strokeWidth="2"
        />
      </svg>
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span className={`font-black tracking-wider text-[18px] ${light ? 'text-white' : 'text-slate-800'}`}>
            ANURAG
          </span>
          <span className={`text-[8px] font-bold tracking-[0.27em] mt-0.5 ${light ? 'text-slate-300' : 'text-slate-500'}`}>
            UNIVERSITY
          </span>
        </div>
      )}
    </div>
  );
};

export default AnuragLogo;
