
import React, { useState, useRef } from 'react';

interface KnobProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (val: number) => void;
    format?: (val: number) => string;
    color?: string;
}

const Knob: React.FC<KnobProps> = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1, 
    onChange, 
    format,
    color = '#a78bfa'
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);
    
    // Calculate rotation (0 to 270 degrees)
    const range = max - min;
    const normalized = Math.min(1, Math.max(0, (value - min) / range));
    const rotation = normalized * 270 - 135; // -135 to +135

    // --- MOUSE EVENTS ---
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startValue.current = value;
        document.body.style.cursor = 'ns-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        processMove(e.clientY);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    // --- TOUCH EVENTS (Mobile) ---
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
        startValue.current = value;
        // Prevent scrolling while adjusting knob
        document.body.style.overflow = 'hidden'; 
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        processMove(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        document.body.style.overflow = '';
    };

    // --- COMMON LOGIC ---
    const processMove = (clientY: number) => {
        const deltaY = startY.current - clientY; // Up is positive
        const sensitivity = range / 200; // 200px for full range
        
        let newValue = startValue.current + (deltaY * sensitivity);
        
        // Snap to step
        newValue = Math.round(newValue / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));
        
        onChange(newValue);
    };

    // SVG Arc calculation
    const r = 18;
    const dashArray = 2 * Math.PI * r;
    const dashOffset = dashArray - (normalized * (dashArray * 0.75));

    return (
        <div className="flex flex-col items-center gap-1 select-none touch-none">
             <div 
                className="relative w-12 h-12 cursor-ns-resize group"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <svg width="48" height="48" className="transform rotate-90 drop-shadow-sm">
                    {/* Background Track */}
                    <circle 
                        cx="24" cy="24" r={r} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.05)" 
                        strokeWidth="4"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashArray * 0.25} // Leave gap
                        strokeLinecap="round"
                    />
                    {/* Value Arc */}
                    <circle 
                        cx="24" cy="24" r={r} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="4"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-75 ease-out"
                        style={{ opacity: 0.9, filter: `drop-shadow(0 0 3px ${color}40)` }}
                    />
                </svg>
                
                {/* Indicator Dot */}
                <div 
                    className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none"
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    <div className="w-1 h-3 bg-white rounded-full absolute -top-1 shadow-sm"></div>
                </div>
            </div>

            <div className="text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
                <div className={`text-[10px] font-mono font-bold ${isDragging ? 'text-accent' : 'text-slate-400'}`}>
                    {format ? format(value) : value.toFixed(0)}
                </div>
            </div>
        </div>
    );
};

export default Knob;
