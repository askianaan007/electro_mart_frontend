'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  role?: 'ADMIN' | 'DEALER';
  onRoleChange?: (role: 'ADMIN' | 'DEALER') => void;
  showRoleToggle?: boolean;
}

export function AuthShell({
  title,
  description,
  children,
  footer,
  role = 'DEALER',
  onRoleChange,
  showRoleToggle = false,
}: AuthShellProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [internalRole, setInternalRole] = useState<'ADMIN' | 'DEALER'>(role);

  const activeRole = role || internalRole;
  const isAdmin = activeRole === 'ADMIN';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const handleToggle = (newRole: 'ADMIN' | 'DEALER') => {
    setInternalRole(newRole);
    if (onRoleChange) {
      onRoleChange(newRole);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden bg-[#030712] px-4 py-8 sm:px-6 sm:py-12 select-none"
    >
      {/* Dynamic 3D Liquid Background Glow Orbs */}
      {/* Liquid Orb 1: Primary Accent */}
      <div
        className={cn(
          'absolute -top-24 -left-24 size-[380px] sm:size-[500px] blur-[100px] sm:blur-[130px] opacity-70 pointer-events-none transition-all duration-1000 ease-in-out',
          isAdmin
            ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-900'
            : 'bg-gradient-to-br from-blue-600 via-sky-500 to-blue-800'
        )}
        style={{ animation: 'liquid-float-1 14s infinite ease-in-out' }}
      />

      {/* Liquid Orb 2: Secondary Accent */}
      <div
        className={cn(
          'absolute -bottom-24 -right-24 size-[350px] sm:size-[480px] blur-[90px] sm:blur-[120px] opacity-65 pointer-events-none transition-all duration-1000 ease-in-out',
          isAdmin
            ? 'bg-gradient-to-tl from-red-500 via-rose-700 to-indigo-900'
            : 'bg-gradient-to-tl from-sky-400 via-blue-600 to-indigo-900'
        )}
        style={{ animation: 'liquid-float-2 16s infinite ease-in-out' }}
      />

      {/* Background Radial Light Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.75)_100%)] pointer-events-none" />

      {/* 3D Perspective Scene Viewport */}
      <div
        className="relative z-10 flex w-full max-w-md flex-col items-center justify-center transition-transform duration-300 ease-out"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg)`,
        }}
      >
        {/* Header Branding Container */}
        <div
          className="mb-6 flex flex-col items-center gap-3 text-center"
          style={{ transform: 'translateZ(30px)' }}
        >
          {/* Glassmorphic Logo Container */}
          <div className="relative flex items-center justify-center p-3 rounded-2xl border border-white/20 bg-slate-900/60 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(255,255,255,0.1)] backdrop-blur-xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
            <Image
              src="/logo-icon.png"
              alt="ElectroMart Logo"
              width={48}
              height={48}
              className="size-10 sm:size-12 shrink-0 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"
              priority
            />
          </div>

          <div className="leading-tight">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              <span className="text-blue-400">Electro</span> <span className="text-red-500">Mart</span>
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-400">
              ERP &amp; Dealer Ecosystem
            </p>
          </div>

          {/* Interactive Role Badge Pill */}
          <div
            className={cn(
              'mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wider uppercase backdrop-blur-md transition-all duration-500 shadow-md',
              isAdmin
                ? 'border-red-500/40 bg-red-950/50 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'border-blue-500/40 bg-blue-950/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            )}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="size-3.5 text-red-400" />
                <span>Admin Workspace</span>
              </>
            ) : (
              <>
                <Store className="size-3.5 text-blue-400" />
                <span>Dealer Workspace</span>
              </>
            )}
          </div>
        </div>

        {/* Role Toggle Selector (if enabled) */}
        {showRoleToggle && (
          <div
            className="mb-4 flex w-full p-1 rounded-xl border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-inner"
            style={{ transform: 'translateZ(20px)' }}
          >
            <button
              type="button"
              onClick={() => handleToggle('DEALER')}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5',
                !isAdmin
                  ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-[0_2px_10px_rgba(59,130,246,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Store className="size-3.5" />
              Dealer Portal
            </button>
            <button
              type="button"
              onClick={() => handleToggle('ADMIN')}
              className={cn(
                'flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5',
                isAdmin
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_2px_10px_rgba(239,68,68,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <ShieldCheck className="size-3.5" />
              Admin Portal
            </button>
          </div>
        )}

        {/* Liquid Glass Card Container */}
        <div
          className={cn(
            'relative w-full rounded-3xl border p-6 sm:p-8 backdrop-blur-2xl sm:backdrop-blur-3xl transition-all duration-700 ease-out',
            isAdmin
              ? 'border-red-500/30 bg-slate-950/65 shadow-[0_20px_60px_rgba(239,68,68,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)]'
              : 'border-blue-500/30 bg-slate-950/65 shadow-[0_20px_60px_rgba(59,130,246,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)]'
          )}
          style={{ transform: 'translateZ(20px)' }}
        >
          {/* iOS Liquid Glass Specular Shimmer Top Reflection */}
          <div className="absolute inset-x-0 top-0 h-24 rounded-t-3xl bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 mb-6 space-y-1.5 text-center">
            <h2
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight text-transparent bg-clip-text',
                isAdmin
                  ? 'bg-gradient-to-r from-purple-300 via-violet-200 to-indigo-300'
                  : 'bg-gradient-to-r from-cyan-300 via-blue-200 to-teal-300'
              )}
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed font-normal">
                {description}
              </p>
            )}
          </div>

          <div className="relative z-10 text-white">{children}</div>
        </div>

        {/* Footer Container */}
        {footer && (
          <div
            className="mt-6 text-center text-xs sm:text-sm text-slate-400 font-medium hover:text-white transition-colors"
            style={{ transform: 'translateZ(15px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
} 

