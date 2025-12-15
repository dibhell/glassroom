import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { AudioSettings, PhysicsSettings } from '../types';

export interface VisualizerHandle {
  reset: () => void;
}

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  energy: number;
  lastBudding: number;
}

interface Props {
  isPlaying: boolean;
  physics: PhysicsSettings;
  audioSettings: AudioSettings;
}

const MAX_BUBBLES = 200;              // HARD LIMIT (mobile safe)
const BUDDING_COOLDOWN = 1600;        // ms
const MAX_VELOCITY = 5;
const MERGE_RADIUS = 12;
const MERGE_PROBABILITY = 0.2;        // 20% per frame
const ENERGY_THRESHOLD = 0.6;

export const Visualizer = forwardRef<VisualizerHandle, Props>(
  ({ isPlaying, physics }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const bubblesRef = useRef<Bubble[]>([]);
    const rafRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      reset() {
        bubblesRef.current = [];
      }
    }));

    const spawnBubble = (x: number, y: number, parent?: Bubble) => {
      if (bubblesRef.current.length >= MAX_BUBBLES) return;

      bubblesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        r: parent ? parent.r * 0.75 : 6 + Math.random() * 4,
        energy: parent ? parent.energy * 0.5 : Math.random(),
        lastBudding: performance.now()
      });
    };

    const step = (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const bubbles = bubblesRef.current;
      const now = performance.now();

      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];

        // ---- PHYSICS ----
        b.vy += physics.gravity * 0.05;
        b.vx += physics.wind * 0.03;

        // Clamp velocity
        b.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, b.vx));
        b.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, b.vy));

        // Protect from NaN
        if (!Number.isFinite(b.vx) || !Number.isFinite(b.vy)) {
          b.vx = b.vy = 0;
        }

        b.x += b.vx;
        b.y += b.vy;

        // Bounce
        if (b.x < b.r || b.x > w - b.r) b.vx *= -0.8;
        if (b.y < b.r || b.y > h - b.r) b.vy *= -0.8;

        // ---- BUDDING (CONTROLLED) ----
        if (
          physics.budding > 0 &&
          b.energy > ENERGY_THRESHOLD &&
          now - b.lastBudding > BUDDING_COOLDOWN &&
          Math.random() < physics.budding * 0.01
        ) {
          b.lastBudding = now;
          spawnBubble(b.x + Math.random() * 10, b.y + Math.random() * 10, b);
        }

        // ---- DRAW ----
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(122,132,118,0.7)';
        ctx.fill();
      }

      // ---- MERGE (LIMITED) ----
      if (physics.cannibalism > 0 && Math.random() < MERGE_PROBABILITY) {
        for (let i = 0; i < bubbles.length; i++) {
          const a = bubbles[i];
          if (!a) continue;

          for (let j = i + 1; j < bubbles.length; j++) {
            const b = bubbles[j];
            if (!b) continue;

            const dx = a.x - b.x;
            const dy = a.y - b.y;

            if (Math.abs(dx) > MERGE_RADIUS || Math.abs(dy) > MERGE_RADIUS) continue;

            const dist = Math.hypot(dx, dy);
            if (dist > MERGE_RADIUS) continue;

            // Merge
            a.r = Math.min(a.r + b.r * 0.4, 20);
            a.energy = Math.min(1, a.energy + b.energy * 0.3);
            bubbles.splice(j, 1);
            break;
          }
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resize = () => {
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
      };

      resize();
      window.addEventListener('resize', resize);

      return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
      if (isPlaying) {
        if (bubblesRef.current.length === 0) {
          for (let i = 0; i < 20; i++) {
            spawnBubble(Math.random() * 400, Math.random() * 300);
          }
        }
        rafRef.current = requestAnimationFrame(step);
      } else {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      }

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying, physics]);

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl bg-[#F2F2F0]"
      />
    );
  }
);

Visualizer.displayName = 'Visualizer';
