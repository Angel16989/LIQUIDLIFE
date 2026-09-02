"use client";

import { useEffect, useRef } from "react";

type CanvasProps = {
  className?: string;
};

function setupCanvas(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(2, Math.floor(rect.width * dpr));
    canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();

  return { context, resize };
}

export function TerrainCanvas({ className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { context, resize } = setup;
    let raf = 0;
    let pointerX = 0.5;
    let pointerY = 0.45;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handlePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width;
      pointerY = (event.clientY - rect.top) / rect.height;
    };

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const rows = 34;
      const cols = 94;
      const horizon = height * 0.42;
      const spacing = width / 48;
      const drift = time * 0.00032;
      const shiftX = (pointerX - 0.5) * spacing * 9;
      const lift = (pointerY - 0.45) * spacing * 10;

      for (let row = rows; row >= 0; row -= 1) {
        const depth = row / rows;
        const yBase = horizon + row * spacing * 0.22;
        context.beginPath();

        for (let col = 0; col <= cols; col += 1) {
          const x = (col / cols) * width;
          const centered = col - cols / 2;
          const curve = Math.pow(centered / (cols / 2), 2) * spacing * 10 * depth;
          const wave =
            Math.sin(col * 0.22 + drift * 5 + row * 0.18) * spacing * 0.55 +
            Math.cos(row * 0.42 - drift * 4) * spacing * 0.5;
          const perspective = 1 - depth * 0.7;
          const px = x + shiftX * perspective;
          const py = yBase + curve + wave * perspective + lift * perspective;

          if (col === 0) context.moveTo(px, py);
          else context.lineTo(px, py);
        }

        context.strokeStyle = `rgba(232, 214, 184, ${0.06 + (1 - depth) * 0.22})`;
        context.lineWidth = Math.max(0.5, 1.2 - depth * 0.7);
        context.stroke();
      }

      for (let i = 0; i < 46; i += 1) {
        const seed = i * 0.713;
        const x = ((seed + drift * (0.18 + (i % 5) * 0.02)) % 1) * width;
        const y = (0.12 + ((seed * 3.7) % 0.45)) * height + Math.sin(drift * 8 + seed * 9) * 11;
        const alpha = 0.08 + ((i % 7) / 7) * 0.22;
        context.fillStyle = i % 4 === 0 ? `rgba(224, 121, 79, ${alpha})` : `rgba(232, 214, 184, ${alpha})`;
        context.beginPath();
        context.arc(x, y, 0.9 + (i % 4) * 0.35, 0, Math.PI * 2);
        context.fill();
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", handlePointer);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

export function OrbitCanvas({ className }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = setupCanvas(canvas);
    if (!setup) return;

    const { context, resize } = setup;
    let raf = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points = Array.from({ length: 120 }, (_, index) => ({
      angle: (index / 120) * Math.PI * 2,
      band: index % 3,
      radius: 0.78 + (index % 3) * 0.12 + ((index * 17) % 9) * 0.004,
      size: 0.8 + ((index * 11) % 7) * 0.22,
    }));

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.42;
      const t = time * 0.00014;

      for (const point of points) {
        const direction = point.band === 1 ? -1 : 1;
        const angle = point.angle + t * direction * (1 + point.band * 0.32);
        const z = Math.sin(angle) * radius * point.radius;
        const scale = 1 + z / (radius * 3.2);
        const x = cx + Math.cos(angle) * radius * point.radius * scale;
        const y = cy + Math.sin(angle * 2) * radius * 0.06 + z * 0.24;
        const alpha = 0.06 + ((z + radius) / (radius * 2)) * 0.28;

        context.fillStyle = point.band === 2 ? `rgba(193, 80, 46, ${alpha})` : `rgba(33, 27, 20, ${alpha})`;
        context.beginPath();
        context.arc(x, y, point.size * scale * 1.6, 0, Math.PI * 2);
        context.fill();
      }

      if (!reduceMotion) {
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
