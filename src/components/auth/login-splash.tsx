'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// How long the splash stays fully visible before fading — shared with the
// page's own entrance animations via the --login-splash-hold CSS variable
// (set on the page root) so the form doesn't start rising in until the
// splash has actually started clearing out of the way.
export const SPLASH_HOLD_MS = 1100;
const SPLASH_FADE_MS = 600;

export function LoginSplash() {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // 3D Canvas Interactive Constellation & Particle Matrix
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate 3D perspective particles
    const particleCount = Math.min(width < 768 ? 45 : 90, 110);
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.6,
      y: (Math.random() - 0.5) * height * 1.6,
      z: Math.random() * 1000 + 1,
      size: Math.random() * 2.2 + 0.8,
      color: Math.random() > 0.35 ? 'rgba(59, 130, 246, ' : 'rgba(6, 182, 212, ',
      speedZ: Math.random() * 1.8 + 0.6,
      alpha: Math.random() * 0.6 + 0.4,
    }));

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX - width / 2) * 0.04;
      targetMouseY = (e.clientY - height / 2) * 0.04;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const fov = 380;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse position interpolation (lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;

      const cx = width / 2 + currentMouseX * 4;
      const cy = height / 2 + currentMouseY * 4;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.z -= p.speedZ;
        if (p.z <= 1) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * width * 1.6;
          p.y = (Math.random() - 0.5) * height * 1.6;
        }

        const k = fov / p.z;
        const px = p.x * k + cx;
        const py = p.y * k + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const size = Math.max(0.6, p.size * k * 1.4);
          const opacity = Math.min(1, (1 - p.z / 1000) * p.alpha);

          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${opacity})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
          ctx.fill();

          // Draw inter-particle electric energy connections
          for (let j = i + 1; j < particles.length; j += 3) {
            const p2 = particles[j];
            const k2 = fov / p2.z;
            const p2x = p2.x * k2 + cx;
            const p2y = p2.y * k2 + cy;
            const dx = px - p2x;
            const dy = py - p2y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 110) {
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(p2x, p2y);
              ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - dist / 110) * 0.18 * opacity})`;
              ctx.lineWidth = 0.6;
              ctx.stroke();
            }
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Timer handling for hold duration & graceful exit transition
  useEffect(() => {
    const fadeTimer = setTimeout(() => setVisible(false), SPLASH_HOLD_MS);
    const unmountTimer = setTimeout(() => setMounted(false), SPLASH_HOLD_MS + SPLASH_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  // Interactive 3D mouse parallax tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  if (!mounted) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-hidden="true"
      className={cn(
        'login-splash fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#030712] transition-all duration-600 ease-out select-none',
        !visible && 'pointer-events-none opacity-0 scale-110 blur-xl'
      )}
    >
      {/* 3D Dynamic WebGL/Canvas Starfield Background */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-70" />

      {/* Ambient Pulsing Glow Orbs - Dual Blue & Red */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[550px] bg-gradient-to-tr from-blue-600/20 via-sky-500/15 to-red-600/20 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[320px] bg-red-500/15 rounded-full blur-[90px] pointer-events-none" />

      {/* Perspective Scene Viewport */}
      <div
        className="relative z-10 flex flex-col items-center justify-center transition-transform duration-300 ease-out"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${mousePos.y * -14}deg) rotateY(${mousePos.x * 14}deg)`,
        }}
      >
        {/* Holographic 3D Multi-Axis Ring Core Container */}
        <div
          className="relative flex size-48 items-center justify-center sm:size-56"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Ring 1: Primary Electric Blue 3D Gyro Orbit */}
          <div
            className="absolute inset-0 rounded-full border-2 border-blue-500/50 shadow-[0_0_35px_rgba(59,130,246,0.4)]"
            style={{
              transform: 'rotateX(70deg) rotateY(15deg) translateZ(10px)',
              animation: 'spin3d 9s linear infinite',
            }}
          >
            <div className="absolute -top-1 left-1/2 size-3 -translate-x-1/2 rounded-full bg-blue-400 shadow-[0_0_12px_#3b82f6]" />
          </div>

          {/* Ring 2: Energetic Red Reverse Orbit Ring */}
          <div
            className="absolute inset-3 rounded-full border-2 border-dashed border-red-500/50"
            style={{
              transform: 'rotateX(60deg) rotateY(-25deg) translateZ(-10px)',
              animation: 'spin3d-reverse 7s linear infinite',
            }}
          >
            <div className="absolute -bottom-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
          </div>

          {/* Ring 3: Accent Dual Holographic Outer Halo */}
          <div
            className="absolute inset-6 rounded-full border border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
            style={{
              transform: 'rotateX(45deg) rotateY(45deg) translateZ(0px)',
              animation: 'spin3d 13s linear infinite',
            }}
          />

          {/* Glowing Inner Core Sphere Glow */}
          <div
            className="absolute size-28 rounded-full bg-gradient-to-br from-blue-500/25 to-red-500/25 blur-md pointer-events-none"
            style={{
              animation: 'pulse-glow 2.5s ease-in-out infinite',
              transform: 'translateZ(15px)',
            }}
          />

          {/* Central Floating Glassmorphic 3D Emblem Container */}
          <div
            className="relative flex size-28 items-center justify-center rounded-3xl border border-white/25 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_50px_rgba(59,130,246,0.4)] backdrop-blur-xl sm:size-32"
            style={{
              transform: 'translateZ(35px)',
              boxShadow:
                '0 20px 40px rgba(0,0,0,0.65), inset 0 1px 2px rgba(255,255,255,0.35), 0 0 30px rgba(59,130,246,0.3)',
            }}
          >
            {/* Shimmer Light Reflection Overlay */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-white/15 to-transparent opacity-90 pointer-events-none" />

            {/* ElectroMart Logo Icon with 3D Elevation & Drop Shadow */}
            <Image
              src="/logo-icon.png"
              alt="ElectroMart Logo"
              width={84}
              height={84}
              className="login-splash-logo relative size-16 drop-shadow-[0_0_30px_rgba(59,130,246,0.9)] sm:size-20 transform transition-all duration-300 hover:scale-110"
              priority
              style={{ transform: 'translateZ(25px)' }}
            />
          </div>
        </div>

        {/* ElectroMart Brand Title & Futuristic Status Indicator */}
        <div
          className="mt-6 flex flex-col items-center text-center"
          style={{ transform: 'translateZ(30px)' }}
        >
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider drop-shadow-lg">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                ELECTRO
              </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)] ml-1">
                MART
              </span>
            </h1>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-slate-400 uppercase opacity-90">
            Powering Smart Commerce
          </p>

          {/* Futuristic Laser Progress Beam - Blue to Red */}
          <div className="relative mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-slate-900/90 border border-slate-700/60 shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-sky-400 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
              style={{
                animation: 'splash-progress 1.1s cubic-bezier(0.65, 0, 0.35, 1) forwards',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

