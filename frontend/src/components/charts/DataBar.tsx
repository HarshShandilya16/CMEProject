// frontend/src/components/charts/DataBar.tsx
import React from 'react';

interface DataBarProps {
  value: number;
  maxValue: number;
  colorClass: string; 
  align?: 'left' | 'right';
}

export const DataBar: React.FC<DataBarProps> = ({ value, maxValue, colorClass, align = 'left' }) => {
  // Calculate the bar's width as a percentage
  const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div
      
      className={`absolute top-0 bottom-0 h-full ${colorClass}`}
      style={{
        width: `${widthPercent}%`,
        [align]: 0, 
      }}
    />
  );
};

export default DataBar;

