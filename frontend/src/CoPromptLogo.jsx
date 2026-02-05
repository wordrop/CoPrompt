import React from 'react';

const CoPromptLogo = ({ size = 100, color = '#475569', className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left Bracket - 2% shorter */}
      <path
        d="M 24 18.64 L 24 18.64 Q 16 18.64 16 26.64 L 16 75.36 Q 16 83.36 24 83.36"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="square"
        fill="none"
      />
      
      {/* Right Bracket - baseline */}
      <path
        d="M 76 18 L 76 18 Q 84 18 84 26 L 84 76 Q 84 84 76 84"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="square"
        fill="none"
      />
      
      {/* Arrow > */}
      <g transform="translate(48, 52)">
        <line
          x1="-14"
          y1="-13"
          x2="14"
          y2="0"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="-14"
          y1="13"
          x2="14"
          y2="0"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export default CoPromptLogo;