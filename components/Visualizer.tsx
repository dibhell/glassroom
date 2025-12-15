import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Bubble, PhysicsSettings, AudioSettings } from '../types';
import { audioService } from '../services/audioEngine';
import { v4 as uuidv4 } from 'uuid';

interface VisualizerProps {
  isPlaying: boolean;
  physics: PhysicsSettings;
  audioSettings: AudioSettings;
}

export interface VisualizerHandle {
  reset: () => void;
}

// 3D Settings
const DEPTH = 1000;
const FOCAL_LENGTH = 700; 
const VERTEX_COUNT = 8; 

// Spatial Grid Settings for Performance
const GRID_SIZE = 120; // Size of grid cell

export const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({ isPlaying, physics, audioSettings }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const requestRef = useRef<number>();

  // Drawing State
  const isDrawingRef = useRef(false);
  const lastSpawnPos = useRef<{x: number, y: number} | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      bubblesRef.current = [];
    }
  }));

  const spawnBubble = (x: number, y: number, z: number = 0, r?: number) => {
    const variants = [
        'hsla(60, 5%, 95%, 1)',   // Snow White
        'hsla(180, 10%, 85%, 1)', // Icy Grey
        'hsla(100, 10%, 80%, 1)', // Pale Moss
        'hsla(200, 15%, 90%, 1)'  // Cold Blue
    ];
    const color = variants[Math.floor(Math.random() * variants.length)];
    const radius = r || Math.random() * 35 + 15; 
    
    const vertices = new Array(VERTEX_COUNT).fill(1);
    const vertexPhases = new Array(VERTEX_COUNT).fill(0).map(() => Math.random() * Math.PI * 2);

    bubblesRef.current.push({
      id: uuidv4(),
      x,
      y,
      z: z || Math.random() * (DEPTH * 0.5), 
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: (Math.random() - 0.5) * 2,
      radius,
      color: color, 
      hue: 0,
      vertices,
      vertexPhases,
      deformation: { scaleX: 1, scaleY: 1, rotation: 0 }
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    isDrawingRef.current = true;
    lastSpawnPos.current = { x, y };
    spawnBubble(x, y, 50);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastSpawnPos.current) {
        const dx = x - lastSpawnPos.current.x;
        const dy = y - lastSpawnPos.current.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Slightly reduced spawn rate for performance
        if (dist > 50) {
            spawnBubble(x, y, 50 + Math.random() * 100);
            lastSpawnPos.current = { x, y };
        }
    }
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    lastSpawnPos.current = null;
  };

  const triggerBubbleSound = (b: Bubble) => {
    const isReverse = Math.random() < physics.reverseChance;
    
    // Volume base on size and raw distance attenuation
    const sizeVol = Math.min(1, Math.max(0.2, b.radius / 70));
    const distanceFactor = Math.max(0, 1 - (b.z / (DEPTH * 1.5))); // Attenuation
    const finalVol = sizeVol * distanceFactor;
    
    // Normalized Spatial Values for Audio Engine
    const width = canvasRef.current ? canvasRef.current.width : 1000;
    
    // Pan: Map X from 0..width to -1..1
    const pan = (b.x / width) * 2 - 1;
    
    // Depth: Map Z from 0..DEPTH to 0..1
    const depth = Math.min(1, Math.max(0, b.z / DEPTH));

    audioService.triggerSound(
        1 - (b.radius / 180), 
        audioSettings.baseFrequency, 
        pan,
        depth,
        b.vz, // Z Velocity for Doppler
        physics.doppler, // Pass new doppler setting
        isReverse, 
        finalVol
    );
  };

  const predictHz = (radius: number) => {
    const sizeFactor = 1 - (radius / 180);
    const roughFreq = audioSettings.baseFrequency * 1.5 * (sizeFactor > 0.8 ? 0.5 : sizeFactor < 0.3 ? 2 : 1);
    return Math.round(roughFreq);
  };

  // --- ROOM RENDERING ---
  const drawRoom = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = '#B9BCB7'; // C3 Ash Grey
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    
    // Project function
    const project = (x: number, y: number, z: number) => {
      const scale = FOCAL_LENGTH / (FOCAL_LENGTH + z);
      return {
        x: (x - w/2) * scale + w/2,
        y: (y - h/2) * scale + h/2
      };
    };

    // Define "Irregular" Room Corners
    // Front face (Screen plane)
    const fTL = { x: 0, y: 0, z: 0 };
    const fTR = { x: w, y: 0, z: 0 };
    const fBR = { x: w, y: h, z: 0 };
    const fBL = { x: 0, y: h, z: 0 };

    // Back face (Irregular distorted)
    // We skew the back wall to make it look like a strange chamber
    const backScale = 0.8;
    const bTL = { x: -w * 0.1, y: -h * 0.1, z: DEPTH };
    const bTR = { x: w * 1.2, y: -h * 0.05, z: DEPTH * 0.9 };
    const bBR = { x: w * 0.9, y: h * 1.1, z: DEPTH };
    const bBL = { x: -w * 0.05, y: h * 1.05, z: DEPTH * 1.1 };

    // Draw Floor Grid (for depth perception)
    ctx.strokeStyle = 'rgba(185, 188, 183, 0.15)'; // Very subtle
    const gridSteps = 5;
    for(let i=0; i<=gridSteps; i++) {
        const t = i/gridSteps;
        // Horizontal lines on floor
        const p1 = project(fBL.x + (fBR.x - fBL.x)*t, fBL.y + (fBR.y - fBL.y)*t, fBL.z);
        const p2 = project(bBL.x + (bBR.x - bBL.x)*t, bBL.y + (bBR.y - bBL.y)*t, bBL.z);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }

    // Draw Main Wireframe
    ctx.strokeStyle = 'rgba(185, 188, 183, 0.4)';
    const corners = [
        [fTL, fTR, fBR, fBL], // Front loop (implicit, usually open)
        [bTL, bTR, bBR, bBL]  // Back loop
    ];
    
    // Connect Front to Back
    const pfTL = project(fTL.x, fTL.y, fTL.z);
    const pbTL = project(bTL.x, bTL.y, bTL.z);
    ctx.beginPath(); ctx.moveTo(pfTL.x, pfTL.y); ctx.lineTo(pbTL.x, pbTL.y); ctx.stroke();

    const pfTR = project(fTR.x, fTR.y, fTR.z);
    const pbTR = project(bTR.x, bTR.y, bTR.z);
    ctx.beginPath(); ctx.moveTo(pfTR.x, pfTR.y); ctx.lineTo(pbTR.x, pbTR.y); ctx.stroke();

    const pfBR = project(fBR.x, fBR.y, fBR.z);
    const pbBR = project(bBR.x, bBR.y, bBR.z);
    ctx.beginPath(); ctx.moveTo(pfBR.x, pfBR.y); ctx.lineTo(pbBR.x, pbBR.y); ctx.stroke();

    const pfBL = project(fBL.x, fBL.y, fBL.z);
    const pbBL = project(bBL.x, bBL.y, bBL.z);
    ctx.beginPath(); ctx.moveTo(pfBL.x, pfBL.y); ctx.lineTo(pbBL.x, pbBL.y); ctx.stroke();

    // Draw Back Rect Loop
    ctx.beginPath();
    ctx.moveTo(pbTL.x, pbTL.y);
    ctx.lineTo(pbTR.x, pbTR.y);
    ctx.lineTo(pbBR.x, pbBR.y);
    ctx.lineTo(pbBL.x, pbBL.y);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  };


  const animate = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    
    // Background
    const gradientBack = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradientBack.addColorStop(0, '#2E2F2B'); // C6
    gradientBack.addColorStop(1, '#3F453F'); // C5
    ctx.fillStyle = gradientBack;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Irregular Room
    drawRoom(ctx, canvas.width, canvas.height);

    // --- DRAW BLACK HOLE ---
    if (physics.blackHole > 0) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const intensity = physics.blackHole;
        const radius = 30 + intensity * 40;

        const grad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 3);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.1, `rgba(0,0,0,0.9)`);
        grad.addColorStop(0.15, `rgba(200, 200, 200, ${intensity * 0.4})`);
        grad.addColorStop(0.4, `rgba(46, 47, 43, ${intensity * 0.8})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2);
        ctx.fill();
    }


    if (!isPlaying) {
      const sorted = [...bubblesRef.current].sort((a, b) => b.z - a.z);
      sorted.forEach(b => drawAmoeba(ctx, b, canvas.width, canvas.height, 0));
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const bubbles = bubblesRef.current;
    const { tempo, gravity, buddingChance, cannibalism, wind, blackHole } = physics;
    const time = Date.now() * 0.002 * tempo; 
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const cz = DEPTH / 2;

    // --- PHYSICS & SPATIAL GRID POPULATION ---
    const grid: Record<string, number[]> = {};

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];

      // Black Hole Swirl Logic
      if (blackHole > 0.05) {
          const dx = cx - b.x;
          const dy = cy - b.y;
          const dz = cz - b.z;
          const distSq = dx*dx + dy*dy + dz*dz;
          const dist = Math.sqrt(distSq);
          
          if (dist < 40 + (blackHole * 20)) {
              bubbles.splice(i, 1);
              i--;
              continue;
          }

          // Attraction
          const force = (blackHole * 5000) / Math.max(1000, distSq);
          
          // Tangential (Swirl) Force
          // Tangent vector 2D (-y, x) relative to center
          const angle = Math.atan2(dy, dx);
          // Add 90 deg for tangent
          const swirlX = -Math.sin(angle); 
          const swirlY = Math.cos(angle);
          const swirlStrength = blackHole * 0.5;

          b.vx += (dx / dist) * force + (swirlX * swirlStrength);
          b.vy += (dy / dist) * force + (swirlY * swirlStrength);
          b.vz += (dz / dist) * force;

          // Spaghettification (Stretch towards center + swirl)
          const targetRotation = angle + (Math.PI/2); // Align with swirl
          const rotDiff = targetRotation - b.deformation.rotation;
          b.deformation.rotation += rotDiff * 0.05;

          const stretchFactor = 1 + (blackHole * 1500 / Math.max(100, dist));
          b.deformation.scaleX += (stretchFactor - b.deformation.scaleX) * 0.1;
          b.deformation.scaleY += ((1 / stretchFactor) - b.deformation.scaleY) * 0.1;

      } else {
          b.vy += gravity * 0.15;
          b.deformation.scaleX += (1 - b.deformation.scaleX) * 0.03;
          b.deformation.scaleY += (1 - b.deformation.scaleY) * 0.03;
      }

      if (wind > 0) {
        const windForce = wind * 0.15;
        b.vx += (Math.random() - 0.5) * windForce;
        b.vy += (Math.random() - 0.5) * windForce;
        b.vz += (Math.random() - 0.5) * windForce;
      }

      b.x += b.vx * tempo;
      b.y += b.vy * tempo;
      b.z += b.vz * tempo;

      // Organic Shape Oscillation
      for(let j=0; j<VERTEX_COUNT; j++) {
          const offset = Math.sin(time + b.vertexPhases[j]) * 0.2 + Math.sin(time * 0.5 + j) * 0.1;
          b.vertices[j] = 1 + offset; 
      }
      
      // Velocity Stretch (Non-Black Hole)
      if (blackHole < 0.2) {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > 0.1) {
            const stretchAmount = 1 + (speed * 0.04); 
            if (Math.abs(b.deformation.scaleX - 1) < 0.3) {
                b.deformation.scaleX += (stretchAmount - b.deformation.scaleX) * 0.1;
                b.deformation.scaleY += ((1/stretchAmount) - b.deformation.scaleY) * 0.1;
                b.deformation.rotation = Math.atan2(b.vy, b.vx);
            }
        }
      }

      // Walls
      let wallHit = false;
      if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -0.9; wallHit = true; }
      else if (b.x + b.radius > canvas.width) { b.x = canvas.width - b.radius; b.vx *= -0.9; wallHit = true; }

      if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -0.9; wallHit = true; }
      else if (b.y + b.radius > canvas.height) { 
          b.y = canvas.height - b.radius; 
          b.vy *= gravity > 0.5 ? -0.6 : -0.9;
          if (Math.abs(b.vy) < 0.5 && gravity > 0.5) b.vy = 0;
          wallHit = true; 
      }

      if (b.z < 0) { b.z = 0; b.vz *= -0.9; wallHit = true; } 
      else if (b.z > DEPTH) { b.z = DEPTH; b.vz *= -0.9; wallHit = true; }

      if (wallHit && blackHole < 0.5) {
        if ((Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.vz)) > 0.5) triggerBubbleSound(b);
        b.deformation.scaleX = 1.2; b.deformation.scaleY = 0.8;
      }

      // Budding
      if (Math.random() < buddingChance * 0.05 && b.radius > 15) {
         b.radius *= 0.8;
         spawnBubble(b.x, b.y, b.z, b.radius);
      }

      // Populate Grid
      const gx = Math.floor(b.x / GRID_SIZE);
      const gy = Math.floor(b.y / GRID_SIZE);
      const key = `${gx},${gy}`;
      if (!grid[key]) grid[key] = [];
      grid[key].push(i);
    }

    // --- COLLISIONS (Grid Optimized) ---
    const collisionPairs: {b1: Bubble, b2: Bubble, priority: number}[] = [];
    
    for (const key in grid) {
        const [gx, gy] = key.split(',').map(Number);
        const cellBubbles = grid[key];

        // Check internal cell collisions
        for(let i=0; i<cellBubbles.length; i++) {
            for(let j=i+1; j<cellBubbles.length; j++) {
                checkCollision(bubbles[cellBubbles[i]], bubbles[cellBubbles[j]], collisionPairs, cannibalism);
            }
        }

        // Check neighbor cells
        const neighborOffsets = [[1,0], [1,1], [0,1], [-1,1]];
        for(const [ox, oy] of neighborOffsets) {
            const nKey = `${gx+ox},${gy+oy}`;
            if(grid[nKey]) {
                const nBubbles = grid[nKey];
                for(let i=0; i<cellBubbles.length; i++) {
                    for(let j=0; j<nBubbles.length; j++) {
                        checkCollision(bubbles[cellBubbles[i]], bubbles[nBubbles[j]], collisionPairs, cannibalism);
                    }
                }
            }
        }
    }

    // Sort for Z-index drawing
    bubbles.sort((a, b) => b.z - a.z);

    // Draw Bubbles
    bubbles.forEach(b => drawAmoeba(ctx, b, canvas.width, canvas.height, (b.z / DEPTH) * 6));

    // Draw HUD
    const topCollisions = collisionPairs.sort((a, b) => b.priority - a.priority).slice(0, 3);
    drawHUD(ctx, topCollisions, canvas.width, canvas.height);

    requestRef.current = requestAnimationFrame(animate);
  };

  const checkCollision = (b1: Bubble, b2: Bubble, pairs: any[], cannibalism: number) => {
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dz = b2.z - b1.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      const minDist = b1.radius + b2.radius;
      
      if (distSq > (minDist * 3) * (minDist * 3)) return;

      const dist = Math.sqrt(distSq);

      if (dist < minDist * 3) {
           const rvx = b2.vx - b1.vx;
           const rvy = b2.vy - b1.vy;
           const rvz = b2.vz - b1.vz;
           const closingSpeed = -(rvx*dx + rvy*dy + rvz*dz);
           if (closingSpeed > 0) {
               const priority = closingSpeed / Math.max(1, dist);
               pairs.push({ b1, b2, priority });
           }
      }

      if (dist < minDist) {
        if (Math.random() < cannibalism) {
          if (b1.radius > b2.radius) {
             b1.radius = Math.pow(Math.pow(b1.radius, 3) + Math.pow(b2.radius, 3), 1/3);
             b2.radius = 0; 
          } else {
             b2.radius = Math.pow(Math.pow(b1.radius, 3) + Math.pow(b2.radius, 3), 1/3);
             b1.radius = 0;
          }
           triggerBubbleSound(b1);
        } else {
            const nx = dx / dist; const ny = dy / dist; const nz = dz / dist;
            const rvx = b2.vx - b1.vx; const rvy = b2.vy - b1.vy; const rvz = b2.vz - b1.vz;
            const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

            if (velAlongNormal > 0) return;

            const e = 0.95; 
            let jImp = -(1 + e) * velAlongNormal;
            jImp /= (1/b1.radius + 1/b2.radius);

            const im1 = 1 / b1.radius; const im2 = 1 / b2.radius;

            b1.vx -= (jImp * nx) * im1; b1.vy -= (jImp * ny) * im1; b1.vz -= (jImp * nz) * im1;
            b2.vx += (jImp * nx) * im2; b2.vy += (jImp * ny) * im2; b2.vz += (jImp * nz) * im2;

            const overlap = minDist - dist;
            b1.x -= nx * overlap * 0.5; b1.y -= ny * overlap * 0.5; b1.z -= nz * overlap * 0.5;
            b2.x += nx * overlap * 0.5; b2.y += ny * overlap * 0.5; b2.z += nz * overlap * 0.5;
            
            triggerBubbleSound(b1);
        }
      }
  }

  useEffect(() => {
    const cleanup = setInterval(() => {
        if (bubblesRef.current.some(b => b.radius === 0)) {
            bubblesRef.current = bubblesRef.current.filter(b => b.radius > 0);
        }
    }, 100);
    return () => clearInterval(cleanup);
  }, []);

  const drawAmoeba = (ctx: CanvasRenderingContext2D, b: Bubble, w: number, h: number, blur: number) => {
    if (b.radius <= 0) return;
    const scale = FOCAL_LENGTH / (FOCAL_LENGTH + b.z);
    const cx = w / 2;
    const cy = h / 2;

    const x2d = (b.x - cx) * scale + cx;
    const y2d = (b.y - cy) * scale + cy;
    
    if (x2d < -50 || x2d > w + 50 || y2d < -50 || y2d > h + 50 || scale < 0.1) return;

    ctx.save();
    
    const blurAmount = Math.max(0, blur - 1); 
    if (blurAmount > 1) ctx.filter = `blur(${blurAmount}px)`;

    ctx.shadowBlur = 5 * scale;
    ctx.shadowColor = 'rgba(255,255,255,0.15)';
    
    ctx.translate(x2d, y2d);
    ctx.rotate(b.deformation.rotation);
    ctx.scale(b.deformation.scaleX * scale, b.deformation.scaleY * scale);
    
    ctx.beginPath();
    const r = b.radius;
    const points: {x: number, y: number}[] = [];

    for (let i = 0; i < VERTEX_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / VERTEX_COUNT;
        const rad = r * b.vertices[i];
        points.push({
            x: Math.cos(angle) * rad,
            y: Math.sin(angle) * rad
        });
    }

    const firstP = points[0];
    const lastP = points[points.length - 1];
    ctx.moveTo((firstP.x + lastP.x) / 2, (firstP.y + lastP.y) / 2);

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    
    ctx.closePath();

    ctx.fillStyle = b.color.replace(', 1)', ', 0.1)'); 
    ctx.fill();

    ctx.strokeStyle = '#D9DBD6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.shadowBlur = 0; 
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.scale(0.85, 0.85);
    ctx.stroke();

    ctx.restore();
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, pairs: {b1: Bubble, b2: Bubble}[], w: number, h: number) => {
    ctx.save();
    ctx.font = '6px Menlo, monospace'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.filter = 'none'; 
    ctx.shadowBlur = 0;

    pairs.forEach(({b1, b2}) => {
       const scale1 = FOCAL_LENGTH / (FOCAL_LENGTH + b1.z);
       const scale2 = FOCAL_LENGTH / (FOCAL_LENGTH + b2.z);
       const cx = w / 2; const cy = h / 2;

       const x1 = (b1.x - cx) * scale1 + cx;
       const y1 = (b1.y - cy) * scale1 + cy;
       const x2 = (b2.x - cx) * scale2 + cx;
       const y2 = (b2.y - cy) * scale2 + cy;

       const mx = (x1 + x2) / 2;
       const my = (y1 + y2) / 2;

       ctx.strokeStyle = '#B9BCB7'; 
       ctx.setLineDash([2, 4]); 
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.moveTo(x1, y1);
       ctx.lineTo(x2, y2);
       ctx.stroke();

       const hz1 = predictHz(b1.radius);
       const hz2 = predictHz(b2.radius);
       const note = Math.min(hz1, hz2);
       const midX = Math.round((b1.x + b2.x) / 2);
       const midY = Math.round((b1.y + b2.y) / 2);
       const midZ = Math.round((b1.z + b2.z) / 2); 
       
       ctx.fillStyle = '#D9DBD6'; 
       ctx.fillText(`${note}Hz · X${midX} Y${midY} Z${midZ}`, mx, my);
    });

    ctx.restore();
  };

  useEffect(() => {
    if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
    }
    
    const handleResize = () => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, physics, audioSettings.baseFrequency]);

  return (
    <div ref={containerRef} className="w-full h-96 md:h-[500px] bg-[#2E2F2B] rounded-lg shadow-2xl overflow-hidden relative border border-[#5F665F] cursor-crosshair perspective-container select-none">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
});