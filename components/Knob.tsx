import React, { useEffect, useRef, useState } from 'react';

interface KnobProps {
  label?: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  format?: (val: number) => string;
  color?: string;
  size?: number;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value,
  defaultValue,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  color = '#7A8476',
  size = 48
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const knobRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    startY: 0,
    startValue: 0,
    isDragging: false
  });

  const SENSITIVITY = 200;

  const updateValue = (clientY: number, shiftKey: boolean) => {
    const { startY, startValue } = stateRef.current;
    const deltaY = startY - clientY;

    const range = max - min;
    if (range <= 0) return;

    const speed = shiftKey ? SENSITIVITY * 5 : SENSITIVITY;
    const deltaValue = (deltaY / speed) * range;

    let newValue = startValue + deltaValue;

    newValue = Math.max(min, Math.min(max, newValue));

    if (step > 0) newValue = Math.round(newValue / step) * step;

    newValue = Math.round(newValue * 10000) / 10000;

    if (newValue !== value) onChange(newValue);
  };

  // ---------- MOUSE (PC) ----------
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    stateRef.current = {
      startY: e.clientY,
      startValue: value,
      isDragging: true
    };

    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  const onWindowMouseMove = (e: MouseEvent) => {
    if (!stateRef.current.isDragging) return;
    e.preventDefault();
    updateValue(e.clientY, e.shiftKey);
  };

  const onWindowMouseUp = () => {
    setIsDragging(false);
    stateRef.current.isDragging = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  };

  // ---------- TOUCH (ANDROID) ----------
  // Zamiast window+body-hack: native listener na ELEMENCIE z passive:false
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;

    const onTouchMoveNative = (ev: TouchEvent) => {
      if (!stateRef.current.isDragging) return;
      ev.preventDefault(); // działa, bo passive:false
      const t = ev.touches[0];
      if (!t) return;
      updateValue(t.clientY, false);
    };

    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });

    return () => {
      el.removeEventListener('touchmove', onTouchMoveNative as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step, onChange, value]);

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();

    setIsDragging(true);
    stateRef.current = {
      startY: e.touches[0].clientY,
      startValue: value,
      isDragging: true
    };
    // USUNIĘTE: document.body.style.overflow = 'hidden';
    // USUNIĘTE: window touch listeners
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    stateRef.current.isDragging = false;
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) onChange(defaultValue);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      document.body.style.cursor = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- VISUALS ---
  const range = max - min;
  const normalized = range <= 0 ? 0 : Math.max(0, Math.min(1, (value - min) / range));
  const rotation = -135 + normalized * 270;

  const strokeWidth = size * 0.1;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const offset = c - normalized * (c * 0.75);

  return (
    // USUNIĘTE: touch-none (to zabija scroll globalnie)
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={knobRef}
        className="relative cursor-ns-resize group"
        style={{
          width: size,
          height: size,
          // klucz: scroll działa, dopóki NIE kręcisz gałką
          touchAction: isDragging ? 'none' : 'pan-y'
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onDoubleClick={handleDoubleClick}
        title="Drag up/down | Shift for precision | Double click reset"
      >
        <svg width={size} height={size} className="transform rotate-90 pointer-events-none drop-shadow-sm">
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="#D9DBD6"
            strokeWidth={strokeWidth}
            strokeDasharray={c}
            strokeDashoffset={c * 0.25}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-75"
            style={{ opacity: 0.9 }}
          />
        </svg>

        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className={`absolute -top-[5%] w-1 rounded-full transition-all duration-200
            ${isDragging ? 'bg-[#2E2F2B] h-3' : 'bg-[#7A8476] h-2.5'}`}
          />
        </div>
      </div>

      <div className="flex flex-col items-center pointer-events-none mt-1">
        {label && (
          <span className="text-[9px] font-bold text-[#7A8476] uppercase tracking-wider leading-none mb-0.5 opacity-80">
            {label}
          </span>
        )}
        <span className={`text-[10px] font-mono font-bold leading-none transition-colors
          ${isDragging ? 'text-[#2E2F2B]' : 'text-[#5F665F]'}`}>
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
