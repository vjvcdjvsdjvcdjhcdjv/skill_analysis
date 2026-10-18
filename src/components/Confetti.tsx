/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lightweight 60fps canvas confetti explosion on quiz completion.
 * Zero external dependencies. Self-cleaning after 3.5 seconds.
 */

import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  durationMs?: number;
}

export function Confetti({ durationMs = 3500 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = ['#276459', '#d7f78c', '#345e69', '#17333b', '#497e3a', '#f59e0b', '#3b82f6', '#ec4899'];
    const particleCount = 120;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: width * 0.5 + (Math.random() - 0.5) * 200,
      y: height * 0.35 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 4,
      gravity: 0.28,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 8,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
    }));

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.vRotation;
        p.vx *= 0.98;

        if (elapsed > durationMs - 1000) {
          p.opacity = Math.max(0, 1 - (elapsed - (durationMs - 1000)) / 1000);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (elapsed < durationMs) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      aria-hidden="true"
    />
  );
}
