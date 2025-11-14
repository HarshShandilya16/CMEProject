// frontend/src/components/charts/DataBar.tsx
import React from 'react';

interface DataBarProps {
  value: number;
  maxValue: number;
  colorClass: string; // e.g., "bg-green-500/30"
  align?: 'left' | 'right';
}

export const DataBar: React.FC<DataBarProps> = ({ value, maxValue, colorClass, align = 'left' }) => {
  // Calculate the bar's width as a percentage
  const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div
      // This div is the bar itself
      className={`absolute top-0 bottom-0 h-full ${colorClass}`}
      style={{
        width: `${widthPercent}%`,
        [align]: 0, // Aligns the bar to the left or right of the cell
      }}
    />
  );
};

export default DataBar;

