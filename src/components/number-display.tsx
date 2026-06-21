// src/components/NumberDisplay.tsx
import React from "react";
import { formatNumber } from "../utils/number-format";

interface NumberDisplayProps {
  value: number | string;
  decimals?: number;
  className?: string; // Allows custom Tailwind classes to be injected
}

export const NumberDisplay: React.FC<NumberDisplayProps> = ({
  value,
  decimals = 2,
  className = "",
}) => {
  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {formatNumber(value, decimals)}
    </span>
  );
};
