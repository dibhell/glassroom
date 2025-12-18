import React, { useEffect, useMemo, useRef, useState } from 'react';

type KnobProps = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  defaultValue?: number;
  steps?: number;
  sensitivity?: number;
  fineSensitivity?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  format?: (v: number) => string;
  color?: string;
  size?: number;
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const snap01 = (t: number, steps?: number) => {
  if (!steps || steps <= 1) return t;
  const k = steps - 1;
  return Math.round(t * k) / k;
};

export function Knob({
  value,
  onChange,
  min = 0,
  max = 1,
  defaultValue = 0,
  steps,
  sensitivity = 0.004,
  fineSensitivity = 0.0015,
  disabled,
  className = '',
  label,
  format,
  color = '#7A8476',
  size = 48,
}: KnobProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<null | { id: number; startY: number; start01: number; lastTapAt: number }>(null);
  const cleanupRef = useRef<null | (() => void)>(null);

  const norm = useMemo(() => clamp((value - min) / (max - min || 1), 0, 1), [value, min, max]);

  const to01 = (v: number) => (v - min) / (max - min || 1);
  const from01 = (t: number) => min + t * (max - min);

  const set01 = (t01: number) => {
    const t = snap01(clamp(t01, 0, 1), steps);
    onChange(from01(t));
  };

  const startDeg = -135;
  const sweepDeg = 270;
  const rotation = startDeg + norm * sweepDeg;

  const strokeWidth = size * 0.1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polar = (deg: number) => {
    const rad = toRad(deg);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const trackStart = polar(startDeg);
  const trackEnd = polar(startDeg + sweepDeg);
  const trackLargeArc = sweepDeg > 180 ? 1 : 0;
  const trackPath = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${trackLargeArc} 1 ${trackEnd.x} ${trackEnd.y}`;

  const valueDeg = startDeg + sweepDeg * norm;
  const valueEnd = polar(valueDeg);
  const valueLargeArc = valueDeg - startDeg > 180 ? 1 : 0;
  const valuePath =
    norm <= 0.0001
      ? ''
      : `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${valueLargeArc} 1 ${valueEnd.x} ${valueEnd.y}`;

  const endDrag = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setIsDragging(false);
    dragRef.current = null;
  };

  useEffect(() => () => endDrag(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    const now = performance.now();
    const lastTap = dragRef.current?.lastTapAt ?? 0;
    const isDouble = now - lastTap < 320;

    dragRef.current = {
      id: e.pointerId,
      startY: e.clientY,
      start01: to01(value),
      lastTapAt: now,
    };

    if (isDouble) {
      set01(to01(defaultValue));
    }

    setIsDragging(true);

    const move = (ev: PointerEvent) => {
      const st = dragRef.current;
      if (!st || ev.pointerId !== st.id) return;
      ev.preventDefault();
      const dy = st.startY - ev.clientY;
      const sens = (ev as any).shiftKey ? fineSensitivity : sensitivity;
      set01(st.start01 + dy * sens);
    };

    const up = (ev: PointerEvent) => {
      const st = dragRef.current;
      if (!st || ev.pointerId !== st.id) return;
      ev.preventDefault();
      endDrag();
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up, { passive: false });
    window.addEventListener('pointercancel', up, { passive: false });
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  };

  return (
    <div
      className={`flex flex-col items-center gap-1 select-none touch-none ${className} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={ref}
        className="relative cursor-ns-resize group touch-none"
        style={{ width: size, height: size, touchAction: 'none' }}
        onPointerDown={onPointerDown}
      >
        <svg width={size} height={size} className="drop-shadow-sm pointer-events-none">
          <path d={trackPath} fill="none" stroke="#D9DBD6" strokeWidth={strokeWidth} strokeLinecap="round" />
          {valuePath && (
            <path
              d={valuePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ opacity: 0.9 }}
            />
          )}
        </svg>
        <div
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="w-1 h-3 bg-white rounded-full absolute -top-1 shadow-sm" />
        </div>
      </div>

      <div className="flex flex-col items-center pointer-events-none mt-1">
        {label && (
          <span className="text-[9px] font-bold text-[#7A8476] uppercase tracking-wider leading-none mb-0.5 opacity-80">
            {label}
          </span>
        )}
        <span className="text-[10px] font-mono font-bold leading-none">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

