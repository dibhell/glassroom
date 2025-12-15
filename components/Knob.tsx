import React, { useMemo, useRef, useState } from "react";

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
  color = "#7A8476",
  size = 48,
}) => {
  const range = max - min;

  const normalized = useMemo(() => {
    if (range <= 0) return 0;
    return Math.min(1, Math.max(0, (value - min) / range));
  }, [value, min, range]);

  const rotation = normalized * 270 - 135;

  // Drag state
  const [isDragging, setIsDragging] = useState(false);

  const knobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const startY = useRef(0);
  const startValue = useRef(0);

  // “Intent” gate: do not start drag immediately on touch, to not kill scrolling
  const isPressed = useRef(false);
  const hasActivatedDrag = useRef(false);

  const DEADZONE_PX = 6; // small threshold before we “commit” to knob turning

  const clampAndSnap = (v: number) => {
    const snapped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, snapped));
  };

  const valueFromDeltaY = (deltaY: number) => {
    const sensitivity = range / 200; // 200px for full range
    const next = startValue.current + deltaY * sensitivity;
    return clampAndSnap(next);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary button for mouse, but allow touch/pen
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isPressed.current = true;
    hasActivatedDrag.current = false;

    pointerIdRef.current = e.pointerId;
    startY.current = e.clientY;
    startValue.current = value;

    // Capture pointer so movement continues even if cursor/finger leaves knob
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Don’t preventDefault yet - allow scrolling until we detect intent
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPressed.current) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const dy = startY.current - e.clientY; // up = positive

    if (!hasActivatedDrag.current) {
      if (Math.abs(dy) < DEADZONE_PX) return;

      // Commit to drag
      hasActivatedDrag.current = true;
      setIsDragging(true);

      // Once we commit, we stop native behaviors (scroll, text selection)
      e.preventDefault();
      document.body.style.cursor = "ns-resize";
    }

    // If dragging, prevent default to keep page from scrolling during drag
    if (hasActivatedDrag.current) e.preventDefault();

    const newValue = valueFromDeltaY(dy);
    onChange(newValue);
  };

  const endDrag = () => {
    isPressed.current = false;
    hasActivatedDrag.current = false;
    setIsDragging(false);
    document.body.style.cursor = "";
    pointerIdRef.current = null;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current === e.pointerId) endDrag();
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (pointerIdRef.current === e.pointerId) endDrag();
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) onChange(clampAndSnap(defaultValue));
  };

  // SVG arc
  const r = size / 2 - 4;
  const dashArray = 2 * Math.PI * r;
  const dashOffset = dashArray - normalized * (dashArray * 0.75);
  const strokeWidth = size * 0.1;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        ref={knobRef}
        className="relative group"
        style={{
          width: size,
          height: size,
          cursor: isDragging ? "ns-resize" : "grab",
          // Key part: allow vertical scrolling unless we are actively dragging
          touchAction: isDragging ? "none" : "pan-y",
          userSelect: "none",
        }}
        role="slider"
        aria-label={label ?? "knob"}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
        title="Double-click to reset"
      >
        <svg
          width={size}
          height={size}
          className="transform rotate-90 drop-shadow-sm pointer-events-none"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#D9DBD6"
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashArray * 0.25}
            strokeLinecap="round"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-75 ease-out"
            style={{ opacity: 0.9, filter: `drop-shadow(0 0 2px ${color}40)` }}
          />
        </svg>

        <div
          className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className="bg-[#F2F2F0] rounded-full absolute -top-[10%] shadow-sm border border-[#B9BCB7]"
            style={{ width: strokeWidth, height: strokeWidth * 2.5 }}
          />
        </div>
      </div>

      <div className="text-center">
        {label && (
          <div className="text-[9px] font-bold text-[#7A8476] uppercase tracking-wider">
            {label}
          </div>
        )}
        <div
          className={`text-[10px] font-mono font-bold ${
            isDragging ? "text-[#3F453F]" : "text-[#5F665F]"
          }`}
        >
          {format ? format(value) : value.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
