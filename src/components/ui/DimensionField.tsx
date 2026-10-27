/**
 * Dimension Field Component
 * Slider plus a typed mm input (up to 2 decimal places) for a single dimension.
 */

import { useEffect, useState } from 'react';

interface DimensionFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

const DECIMAL_PATTERN = /^\d*\.?\d{0,2}$/;

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function DimensionField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  compact = false,
}: DimensionFieldProps) {
  const [text, setText] = useState(String(round2(value)));

  // Don't overwrite partial input like "12." that already parses to the current value
  useEffect(() => {
    setText((prev) => (parseFloat(prev) === round2(value) ? prev : String(round2(value))));
  }, [value]);

  const handleTextChange = (raw: string) => {
    if (!DECIMAL_PATTERN.test(raw)) return;
    setText(raw);
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && n >= min && n <= max) {
      onChange(round2(n));
    }
  };

  const commit = () => {
    const n = parseFloat(text);
    if (Number.isNaN(n)) {
      setText(String(round2(value)));
      return;
    }
    const clamped = round2(Math.min(max, Math.max(min, n)));
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div>
      <div className={`flex items-center justify-between ${textSize} mb-1`}>
        <span className="text-gray-600">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className={`w-20 px-2 py-0.5 ${textSize} text-right font-mono text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500`}
            aria-label={`${label} (mm)`}
          />
          <span className="text-gray-400">mm</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
