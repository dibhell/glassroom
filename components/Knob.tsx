import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  value: number; // 0 to 1
  onChange: (val: number) => void;
  size?: number;
}

export const Knob: React.FC<KnobProps> = ({ value, onChange, size = 64 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault(); 
      // Decreased divisor to 100 to make it more sensitive (less 'blocked')
      const deltaY = startYRef.current - e.clientY;
      const sensitivity = 100; 
      const deltaVal = deltaY / sensitivity;
      const newVal = Math.min(1, Math.max(0, startValRef.current + deltaVal));
      onChange(newVal);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Adding cursor style to body to ensure grabbing cursor persists even if mouse leaves element
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = '';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, onChange, value]);

  const rotation = value * 270 - 135;

  return (
    <div 
      className={`relative flex items-center justify-center touch-none select-none ${isDragging ? 'cursor-grabbing' : 'cursor-ns-resize'}`}
      style={{ width: size, height: size }}
      onMouseDown={handleMouseDown}
    >
      {/* Background Circle - C2 Cold Fog */}
      <div className="absolute inset-0 rounded-full bg-[#D9DBD6] shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] border border-[#B9BCB7]"></div>
      
      {/* Visual Value Arc (SVG) */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#B9BCB7" strokeWidth="6" strokeDasharray="251.2" strokeDashoffset="0" className="opacity-20" />
      </svg>

      {/* Inner Cap */}
      <div className="absolute w-[80%] h-[80%] rounded-full bg-[#F2F2F0] shadow-md flex items-center justify-center border border-[#B9BCB7]/50">
           {/* Rotating Indicator */}
           <div 
             className="w-full h-full absolute top-0 left-0 rounded-full transition-transform duration-75 ease-out"
             style={{ transform: `rotate(${rotation}deg)` }}
           >
              {/* The Dot Position Marker */}
              <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[15%] h-[15%] bg-[#7A8476] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.2)]"></div>
           </div>
      </div>
    </div>
  );
};