'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#6366F1', '#FF9F1C', '#4CC9F0', '#2EC4B6', '#FF77E1', '#9D4EDD', '#F4D03F'];

export default function ConfettiEffect({ active = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 150;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 3 + 2,
        opacity: 1,
      });
    }

    let animationId;
    let frame = 0;
    const maxFrames = 180; // ~3 seconds at 60fps

    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fadeOut = frame > maxFrames * 0.7 ? 1 - (frame - maxFrames * 0.7) / (maxFrames * 0.3) : 1;

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;
        p.speedY += 0.05; // gravity
        p.opacity = fadeOut;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frame < maxFrames) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        pointerEvents: 'none',
      }}
      id="confetti-canvas"
    />
  );
}
