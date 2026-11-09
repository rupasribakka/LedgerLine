import React, { useEffect, useRef, useState } from 'react';

const MAX_PARTICLES = 60;

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // 1. Check touch device and prefers-reduced-motion
    const checkDisabled = () => {
      const isTouch =
        window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      return isTouch || prefersReducedMotion;
    };

    if (checkDisabled()) {
      setIsDisabled(true);
      document.documentElement.classList.remove('custom-cursor-active');
      return;
    }

    // Hide default cursor on desktop when custom cursor is active
    document.documentElement.classList.add('custom-cursor-active');

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      if (e.matches) {
        setIsDisabled(true);
        document.documentElement.classList.remove('custom-cursor-active');
      }
    };
    motionQuery.addEventListener?.('change', handleMotionChange);

    // Particle pool
    const particles = [];
    let mouse = { x: -100, y: -100 };
    let ring = { x: -100, y: -100 };
    let animationFrameId = null;
    let isTabVisible = !document.hidden;

    // Handle tab visibility change
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Track mouse coordinates
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Add emerald particle if tab is visible and under MAX_PARTICLES limit
      if (isTabVisible && particles.length < MAX_PARTICLES) {
        // Spawn 1 faint emerald particle with slight velocity
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 + 0.2,
          size: Math.random() * 2.5 + 1,
          alpha: 0.45,
          life: 1.0,
          decay: Math.random() * 0.03 + 0.02,
        });
      }

      // Check if hovering interactive element
      const target = e.target;
      if (target) {
        const interactive = target.closest(
          'button, a, input, select, [role="button"], [data-magnetic="true"]'
        );
        setIsHovering(!!interactive);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Magnetic Button Hover Handler
    const handleMagneticMove = (e) => {
      const magneticEl = e.target.closest('[data-magnetic="true"]');
      if (magneticEl) {
        const rect = magneticEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - centerX) * 0.22;
        const deltaY = (e.clientY - centerY) * 0.22;
        magneticEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      }
    };

    const handleMagneticLeave = (e) => {
      const magneticEl = e.target.closest('[data-magnetic="true"]');
      if (magneticEl) {
        magneticEl.style.transform = 'translate(0px, 0px)';
      }
    };

    document.addEventListener('mousemove', handleMagneticMove);
    document.addEventListener('mouseleave', handleMagneticLeave, true);

    // Canvas resize
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Render loop with lerp and particle physics
    const render = () => {
      // Lerp custom ring cursor
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      }

      // Render faint emerald particles on canvas
      if (ctx && canvas && isTabVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          p.alpha = Math.max(p.life * 0.45, 0);

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(45, 255, 154, ${p.alpha})`;
          ctx.shadowColor = 'rgba(45, 255, 154, 0.4)';
          ctx.shadowBlur = 4;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      motionQuery.removeEventListener?.('change', handleMotionChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleMagneticMove);
      document.removeEventListener('mouseleave', handleMagneticLeave, true);
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (isDisabled) return null;

  return (
    <>
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Custom Ring Cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 z-50 -ml-4 -mt-4 transition-[width,height,background-color,border-color] duration-150 ease-out flex items-center justify-center rounded-full will-change-transform"
        style={{
          width: isHovering ? '48px' : '32px',
          height: isHovering ? '48px' : '32px',
          marginLeft: isHovering ? '-24px' : '-16px',
          marginTop: isHovering ? '-24px' : '-16px',
          border: isHovering
            ? '1.5px solid rgba(45, 255, 154, 0.9)'
            : '1px solid rgba(45, 255, 154, 0.65)',
          backgroundColor: isHovering
            ? 'rgba(45, 255, 154, 0.12)'
            : 'rgba(45, 255, 154, 0.03)',
          boxShadow: isHovering
            ? '0 0 20px rgba(45, 255, 154, 0.35)'
            : '0 0 10px rgba(45, 255, 154, 0.15)',
        }}
      >
        {/* Tiny center dot */}
        <div
          className="rounded-full bg-[#2dff9a] transition-all duration-150"
          style={{
            width: isHovering ? '5px' : '3px',
            height: isHovering ? '5px' : '3px',
            boxShadow: '0 0 6px #2dff9a',
          }}
        />
      </div>
    </>
  );
}
