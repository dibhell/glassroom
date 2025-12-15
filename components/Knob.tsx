import React, { useState, useRef, useEffect } from 'react';

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
  size = 48,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Refs for drag state to avoid dependency cycles in effects
  const stateRef = useRef({
    startY: 0,
    startValue: 0,
    value,
    min,
    max,
    step,
    onChange
  });

  // Sync refs with props
  useEffect(() => {
    stateRef.current = { ...stateRef.current, value, min, max, step, onChange };
  }, [value, min, max, step, onChange]);

  // --- LOGIC: CALCULATION ---
  const calculate = (clientY: number) => {
    const { startY, startValue, min, max, step, onChange } = stateRef.current;
    const range = max - min;
    const deltaY = startY - clientY; // Up is positive
    
    // Sensitivity: 200px for full range is standard. 
    // We add a slight exponential curve or just keep linear for predictability.
    const sensitivity = range / 200; 

    let newValue = startValue + (deltaY * sensitivity);
    
    // Snap to step
    if (step > 0) {
        newValue = Math.round(newValue / step) * step;
    }
    
    // Clamp
    newValue = Math.max(min, Math.min(max, newValue));
    
    // Only fire if changed (optional, but good for perf)
    if (newValue !== stateRef.current.value) {
        onChange(newValue);
    }
  };

  // --- MOUSE EFFECT (PC) ---
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      calculate(e.clientY);
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };

    // Attach global listeners
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    document.body.style.cursor = 'ns-resize';

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging]);


  // --- HANDLERS ---
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();
    
    // Init Drag State
    stateRef.current.startY = e.clientY;
    stateRef.current.startValue = value;
    
    setIsDragging(true);
  };

  // Prevent default browser drag behavior (ghost image)
  const handleDragStart = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Mobile logic remains simple and direct
    stateRef.current.startY = e.touches[0].clientY;
    stateRef.current.startValue = value;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    calculate(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) onChange(defaultValue);
  };

  // --- RENDER HELPERS ---
  const range = max - min;
  const normalized = range <= 0 ? 0 : Math.min(1, Math.max(0, (value - min) / range));
  const rotation = normalized * 270 - 135; // -135 to 135 deg

  // SVG Geometry
  const r = size / 2 - 4;
  const dashArray = 2 * Math.PI * r;
  const dashOffset = dashArray - normalized * (dashArray * 0.75); // 75% arc
  const strokeWidth = size * 0.1;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className="relative group outline-none tap-highlight-transparent"
        style={{
          width: size,
          height: size,
          cursor: 'ns-resize',
          touchAction: 'none' // Key for mobile
        }}
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart} // Fix for PC "sticky" drag
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        title="Double-click to reset"
      >
        <svg width={size} height={size} className="transform rotate-90 drop-shadow-sm pointer-events-none">
          {/* Track */}
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
          {/* Active Arc */}
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
            style={{ 
                opacity: 0.9, 
                filter: `drop-shadow(0 0 2px ${color}40)` 
            }}
          />
        </svg>

        {/* Indicator Dot */}
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

      {/* Label & Value */}
      <div className="text-center flex flex-col items-center">
        {label && (
            <div className="text-[9px] font-bold text-[#7A8476] uppercase tracking-wider leading-none mb-0.5">
                {label}
            </div>
        )}
        <div className={`text-[10px] font-mono font-bold leading-none ${isDragging ? 'text-[#3F453F]' : 'text-[#5F665F]'}`}>
          {format ? format(value) : value.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
