import React, { useEffect, useRef, useState } from 'react';

const MAX_PARTICLES = 50;

/**
 * Premium Custom Cursor with Real-Time Viewport Tracking.
 * Layered with maximum z-index (z-[999999]) and pointer-events-none to ensure
 * it remains crisp, visible, and unclipped across all sidebars, navigation drawers,
 * and high-contrast dark panels.
 */
export default function CustomCursor() {
  const cursorRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check touch device and prefers-reduced-motion
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

    // Activate custom cursor styling
    document.documentElement.classList.add('custom-cursor-active');

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      if (e.matches) {
        setIsDisabled(true);
        document.documentElement.classList.remove('custom-cursor-active');
      }
    };
    motionQuery.addEventListener?.('change', handleMotionChange);

    const particles = [];
    let mouse = { x: -100, y: -100 };
    let ring = { x: -100, y: -100 };
    let animationFrameId = null;
    let isTabVisible = !document.hidden;
    let hasInitialized = false;

    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Track mouse coordinates across entire window
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      if (!hasInitialized) {
        ring.x = e.clientX;
        ring.y = e.clientY;
        hasInitialized = true;
        setIsVisible(true);
      } else {
        setIsVisible(true);
      }

      // Add faint electric cyan particle with velocity
      if (isTabVisible && particles.length < MAX_PARTICLES) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.7,
          vy: (Math.random() - 0.5) * 0.7 + 0.15,
          size: Math.random() * 2.2 + 1,
          alpha: 0.4,
          life: 1.0,
          decay: Math.random() * 0.035 + 0.025,
        });
      }

      // Check if hovering interactive element (links, buttons, inputs, tabs, roles)
      const target = e.target;
      if (target) {
        const interactive = target.closest(
          'button, a, input, select, textarea, [role="button"], [data-magnetic="true"], .cursor-pointer'
        );
        setIsHovering(!!interactive);
      }
    };

    const handleMouseEnter = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      ring.x = e.clientX;
      ring.y = e.clientY;
      setIsVisible(true);
    };

    const handleMouseLeave = (e) => {
      // Only hide if the pointer actually leaves the browser viewport
      if (!e?.relatedTarget && (e?.clientX <= 0 || e?.clientY <= 0 || e?.clientX >= window.innerWidth || e?.clientY >= window.innerHeight)) {
        setIsVisible(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });

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
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Smooth render loop
    const render = () => {
      // High-precision smooth lerp (0.24 for snappy responsive tracking)
      ring.x += (mouse.x - ring.x) * 0.24;
      ring.y += (mouse.y - ring.y) * 0.24;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      }

      // Render faint particles on canvas
      if (ctx && canvas && isTabVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          p.alpha = Math.max(p.life * 0.4, 0);

          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(22, 191, 255, ${p.alpha})`;
          ctx.shadowColor = 'rgba(22, 191, 255, 0.4)';
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
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (isDisabled) return null;

  return (
    <>
      {/* Particle Trail Canvas - Highest z-index layer, pass-through pointer events */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{
          zIndex: 999998,
          mixBlendMode: 'screen',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
        }}
      />

      {/* Custom Ring Cursor - Above all sidebars, headers, and modals */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed top-0 left-0 transition-[width,height,background-color,border-color,opacity] duration-150 ease-out flex items-center justify-center rounded-full will-change-transform"
        style={{
          zIndex: 999999,
          opacity: isVisible ? 1 : 0,
          width: isHovering ? '44px' : '28px',
          height: isHovering ? '44px' : '28px',
          marginLeft: isHovering ? '-22px' : '-14px',
          marginTop: isHovering ? '-22px' : '-14px',
          border: isHovering
            ? '1.5px solid rgba(22, 191, 255, 0.95)'
            : '1.5px solid rgba(22, 191, 255, 0.8)',
          backgroundColor: isHovering
            ? 'rgba(22, 191, 255, 0.16)'
            : 'rgba(22, 191, 255, 0.04)',
          boxShadow: isHovering
            ? '0 0 22px rgba(22, 191, 255, 0.65)'
            : '0 0 12px rgba(22, 191, 255, 0.35)',
        }}
      >
        {/* High-visibility center dot */}
        <div
          className="rounded-full bg-[#16BFFF] transition-all duration-150"
          style={{
            width: isHovering ? '5px' : '3.5px',
            height: isHovering ? '5px' : '3.5px',
            boxShadow: '0 0 10px #16BFFF, 0 0 3px #FFFFFF',
          }}
        />
      </div>
    </>
  );
}
