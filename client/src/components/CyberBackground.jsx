import React, { useEffect, useRef } from 'react';

/**
 * CyberBackground Component
 * 
 * High-performance Canvas-based cybersecurity background featuring:
 * - Ambient drifting radial light in deep navy, cyan, and violet
 * - Digital network particles with proximity-based cyber connections
 * - Interactive cursor halo and subtle particle trailing
 * - Subtle rotating radar sweep line
 * - Respects prefers-reduced-motion
 * - Non-intrusive pointer-events: none layer to ensure full accessibility
 */
export default function CyberBackground() {
  const canvasRef = useRef(null);
  const cursorHaloRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, isHovering: false });
  const trailParticlesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if user has reduced-motion preference or touch device
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle nodes configuration
    const isMobile = width < 768;
    const NODE_COUNT = isMobile ? 28 : 55;
    const CONNECT_DISTANCE = isMobile ? 95 : 125;
    const MOUSE_INFLUENCE_RADIUS = 140;

    const colors = [
      { r: 6, g: 182, b: 212 },   // Cyan #06b6d4
      { r: 59, g: 130, b: 246 },  // Blue #3b82f6
      { r: 139, g: 92, b: 246 },  // Violet #8b5cf6
      { r: 99, g: 102, b: 241 },  // Indigo #6366f1
    ];

    // Initialize network nodes
    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
        baseRadius: Math.random() * 1.8 + 1.2,
        color,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // Cursor position smoothing (lerp)
    let smoothMouseX = -1000;
    let smoothMouseY = -1000;
    let radarAngle = 0;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isHovering = true;

      // Add a lightweight trailing sparkle particle (limited to avoid memory pressure)
      if (!prefersReducedMotion && trailParticlesRef.current.length < 24) {
        if (Math.random() > 0.4) {
          const color = colors[Math.floor(Math.random() * colors.length)];
          trailParticlesRef.current.push({
            x: e.clientX + (Math.random() - 0.5) * 8,
            y: e.clientY + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            life: 1.0,
            decay: 0.035 + Math.random() * 0.02,
            size: Math.random() * 2 + 1,
            color,
          });
        }
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    if (!isTouch) {
      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    // Main animation loop
    let lastTime = performance.now();

    const render = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Smooth cursor halo tracking
      if (mouseRef.current.isHovering) {
        smoothMouseX += (mouseRef.current.x - smoothMouseX) * 0.18;
        smoothMouseY += (mouseRef.current.y - smoothMouseY) * 0.18;

        if (cursorHaloRef.current) {
          cursorHaloRef.current.style.transform = `translate3d(${smoothMouseX}px, ${smoothMouseY}px, 0)`;
          cursorHaloRef.current.style.opacity = '1';
        }
      } else if (cursorHaloRef.current) {
        cursorHaloRef.current.style.opacity = '0';
      }

      // Radar sweep effect (subtle background sweep from top-center / screen center)
      if (!prefersReducedMotion) {
        radarAngle += 0.005;
        const centerX = width * 0.5;
        const centerY = height * 0.4;
        const maxRadius = Math.max(width, height) * 0.8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, radarAngle - 0.25, radarAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();

        const radarGrad = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, maxRadius
        );
        radarGrad.addColorStop(0, 'rgba(6, 182, 212, 0.025)');
        radarGrad.addColorStop(0.7, 'rgba(59, 130, 246, 0.012)');
        radarGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

        ctx.fillStyle = radarGrad;
        ctx.fill();
        ctx.restore();
      }

      // Update & Draw Network Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          // Boundary bouncing
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          // Gentle mouse interaction (nodes gently deflect or react to mouse)
          if (mouseRef.current.isHovering) {
            const dx = node.x - mouseRef.current.x;
            const dy = node.y - mouseRef.current.y;
            const dist = Math.hypot(dx, dy);

            if (dist < MOUSE_INFLUENCE_RADIUS && dist > 0) {
              const force = (MOUSE_INFLUENCE_RADIUS - dist) / MOUSE_INFLUENCE_RADIUS;
              node.x += (dx / dist) * force * 1.2;
              node.y += (dy / dist) * force * 1.2;
            }
          }
        }

        // Draw connections between neighboring nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.hypot(dx, dy);

          if (dist < CONNECT_DISTANCE) {
            const alpha = (1 - dist / CONNECT_DISTANCE) * 0.22;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Connect node to mouse if nearby
        if (mouseRef.current.isHovering) {
          const mdx = node.x - mouseRef.current.x;
          const mdy = node.y - mouseRef.current.y;
          const mdist = Math.hypot(mdx, mdy);
          if (mdist < MOUSE_INFLUENCE_RADIUS) {
            const mAlpha = (1 - mdist / MOUSE_INFLUENCE_RADIUS) * 0.35;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${mAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Node pulse & rendering
        const pulse = Math.sin(time * 0.002 + node.pulseOffset) * 0.35 + 0.65;
        const currentRadius = node.baseRadius * (0.85 + pulse * 0.3);

        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, ${0.4 + pulse * 0.4})`;
        ctx.shadowColor = `rgba(${node.color.r}, ${node.color.g}, ${node.color.b}, 0.8)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for performance
      }

      // Update & Render Mouse Trail Particles
      for (let k = trailParticlesRef.current.length - 1; k >= 0; k--) {
        const p = trailParticlesRef.current[k];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0) {
          trailParticlesRef.current.splice(k, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.life * 0.6})`;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(performance.now());
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (!isTouch) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <>
      {/* Deep Cyber Navy Backdrop with Ambient Radial Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-30 overflow-hidden bg-[#030712]">
        {/* Soft Ambient Light Movement (Cyan, Blue, Violet) */}
        <div 
          className="absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full bg-linear-to-br from-cyan-600/12 via-blue-600/8 to-transparent blur-[140px] animate-slow-pulse"
        />
        <div 
          className="absolute top-1/3 -right-40 h-[700px] w-[700px] rounded-full bg-linear-to-bl from-violet-600/10 via-indigo-600/8 to-transparent blur-[160px] animate-slow-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div 
          className="absolute -bottom-40 left-1/4 h-[600px] w-[600px] rounded-full bg-linear-to-tr from-blue-700/10 via-cyan-500/6 to-transparent blur-[150px] animate-slow-pulse"
          style={{ animationDelay: '4s' }}
        />

        {/* Digital Circuit Grid Overlay */}
        <div className="absolute inset-0 cyber-grid-overlay opacity-60" />
      </div>

      {/* Interactive Network Particles & Radar Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none -z-20 h-full w-full"
      />

      {/* Cyber Cursor Glow Halo */}
      <div
        ref={cursorHaloRef}
        className="fixed pointer-events-none -z-10 -top-8 -left-8 h-16 w-16 rounded-full opacity-0 transition-opacity duration-300 will-change-transform"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)',
          boxShadow: '0 0 30px 4px rgba(6, 182, 212, 0.2)',
        }}
      />
    </>
  );
}
