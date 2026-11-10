import React, { useEffect, useRef } from 'react';

/**
 * CyberBackground Component
 * 
 * An elite, high-performance Canvas cybersecurity visual background (Cybersecurity Blue):
 * - Rotating radar sweep with electric cyan & neon blue gradient
 * - Interconnected sentinel nodes forming a zero-trust mesh with security pulses
 * - Vertical hexadecimal / binary matrix streams drifting smoothly down
 * - Tactical HUD corner brackets with real-time cybersecurity status tags
 * - Floating cryptographic telemetry tags (SHA-256, ZERO_TRUST, AES-256, ROW_LOCK, Σ=0)
 * - Perspective cyber grid with targeting crosshairs
 * - Interactive cursor magnetic glow halo
 * - Respects prefers-reduced-motion and tab visibility
 */
export default function CyberBackground({
  opacity = 0.9,
  showRadar = true,
  showGrid = true,
  showMatrix = true,
  showHUD = true,
  nodeCount = null,
  accentColor = '#16BFFF',
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    let animationFrameId;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      isHovering: false,
    };

    const handleResize = () => {
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      if (isTouch) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouse.isHovering = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    if (!isTouch) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    // -----------------------------------------------------------------
    // CYBER SENTINEL MESH NODES (Cybersecurity Blue Theme)
    // -----------------------------------------------------------------
    const isMobile = width < 768;
    const COUNT = nodeCount || (isMobile ? 36 : 68);
    const CONNECT_DIST = isMobile ? 110 : 145;
    const MOUSE_RADIUS = 160;

    const colors = [
      { r: 22, g: 191, b: 255, hex: '#16BFFF' }, // Electric Cyan
      { r: 56, g: 123, b: 255, hex: '#387BFF' }, // Neon Blue
      { r: 139, g: 124, b: 255, hex: '#8B7CFF' }, // Subtle Purple
      { r: 56, g: 189, b: 248, hex: '#38bdf8' }, // Sky Blue
    ];

    const nodes = [];
    for (let i = 0; i < COUNT; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseRadius: Math.random() * 2 + 1.2,
        radius: Math.random() * 2 + 1.2,
        col,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        isSentinel: i % 7 === 0, // Special sentinel anchor nodes with sonar ripples
      });
    }

    // Traveling Data Pulses across mesh
    const pulses = [];
    const PULSE_COUNT = isMobile ? 8 : 16;
    for (let p = 0; p < PULSE_COUNT; p++) {
      pulses.push({
        from: Math.floor(Math.random() * COUNT),
        to: Math.floor(Math.random() * COUNT),
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        size: Math.random() * 2.2 + 1.8,
      });
    }

    // Floating Cyber Tags & Cryptographic Hash Snippets
    const telemetryTags = [
      'ZERO_TRUST: ACTIVE',
      'TRIGGER: IMMUTABLE',
      'SHA-256: CHAIN_LOCKED',
      'ENC: AES-256-GCM',
      'INV: Σ=0 PAISE',
      'SENTINEL_01: ONLINE',
      'ROW_LOCK: DEADLOCK_FREE',
      'AUTH: RS256/JWT',
      'KEY: 0x4E9B...8A01',
      'HASH: 0xF71C...B410',
      'STATE: VERIFIED',
      'IDEMPOTENCY: ENFORCED',
    ];

    const cyberParticles = [];
    const TAG_COUNT = isMobile ? 12 : 24;
    for (let i = 0; i < TAG_COUNT; i++) {
      cyberParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        text: telemetryTags[i % telemetryTags.length],
        alpha: Math.random() * 0.35 + 0.15,
      });
    }

    // Vertical Matrix / Hexadecimal Code Streams
    const hexChars = '0123456789ABCDEF•#*+§µ';
    const STREAM_COUNT = isMobile ? 8 : 16;
    const streams = [];
    for (let s = 0; s < STREAM_COUNT; s++) {
      streams.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.7 + Math.random() * 1.4,
        chars: Array.from({ length: 6 + Math.floor(Math.random() * 6) }, () =>
          hexChars[Math.floor(Math.random() * hexChars.length)]
        ),
        updateTimer: 0,
        opacity: 0.12 + Math.random() * 0.16,
      });
    }

    // Radar state
    let radarAngle = 0;

    // -----------------------------------------------------------------
    // MAIN RENDER LOOP
    // -----------------------------------------------------------------
    const render = (time) => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // 1. Subtle Cyber Perspective Grid & Crosshairs
      if (showGrid) {
        ctx.save();
        const gridSize = isMobile ? 60 : 75;
        ctx.strokeStyle = 'rgba(22, 191, 255, 0.04)';
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Draw tactical targeting crosshairs at select grid intersections
        ctx.strokeStyle = 'rgba(22, 191, 255, 0.18)';
        ctx.lineWidth = 1;
        const crosshairStep = gridSize * 2;
        for (let x = crosshairStep; x < width; x += crosshairStep) {
          for (let y = crosshairStep; y < height; y += crosshairStep) {
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x + 5, y);
            ctx.moveTo(x, y - 5);
            ctx.lineTo(x, y + 5);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 2. Vertical Hexadecimal / Binary Streams Drifting Smoothly
      if (showMatrix && !prefersReducedMotion) {
        ctx.save();
        ctx.font = '10px "JetBrains Mono", monospace';
        for (const st of streams) {
          st.y += st.speed;
          if (st.y > height + 80) {
            st.y = -60;
            st.x = Math.random() * width;
          }
          st.updateTimer++;
          if (st.updateTimer % 14 === 0) {
            st.chars[Math.floor(Math.random() * st.chars.length)] =
              hexChars[Math.floor(Math.random() * hexChars.length)];
          }
          for (let c = 0; c < st.chars.length; c++) {
            const cyPos = st.y - c * 13;
            if (cyPos > -15 && cyPos < height + 15) {
              const charAlpha = (1 - c / st.chars.length) * st.opacity;
              ctx.fillStyle = c === 0 ? 'rgba(244, 248, 255, 0.55)' : `rgba(22, 191, 255, ${charAlpha})`;
              ctx.fillText(st.chars[c], st.x, cyPos);
            }
          }
        }
        ctx.restore();
      }

      // 3. Rotating Cybersecurity Radar Sweep
      if (showRadar && !prefersReducedMotion) {
        radarAngle += 0.008;
        const cx = width * 0.5;
        const cy = height * 0.45;
        const maxRadius = Math.max(width, height) * 0.75;

        ctx.save();
        // Radar sweep cone
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius, radarAngle - 0.45, radarAngle);
        ctx.lineTo(cx, cy);
        ctx.closePath();

        const radarGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        radarGrad.addColorStop(0, 'rgba(22, 191, 255, 0.15)');
        radarGrad.addColorStop(0.35, 'rgba(56, 123, 255, 0.04)');
        radarGrad.addColorStop(0.7, 'rgba(139, 124, 255, 0.015)');
        radarGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = radarGrad;
        ctx.fill();

        // Leading edge radar scan line
        const endX = cx + Math.cos(radarAngle) * maxRadius;
        const endY = cy + Math.sin(radarAngle) * maxRadius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(22, 191, 255, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#16BFFF';
        ctx.shadowBlur = 10;
        ctx.stroke();

        // Concentric radar distance rings with tactical zone labels
        ctx.shadowBlur = 0;
        ctx.font = '8px "JetBrains Mono", monospace';
        for (let r = 120; r < maxRadius; r += 160) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(22, 191, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Concentric zone label
          ctx.fillStyle = 'rgba(22, 191, 255, 0.22)';
          ctx.fillText(`ZONE_${Math.round(r)}`, cx + r + 6, cy - 4);
        }
        ctx.restore();
      }

      // 4. Floating Cryptographic Telemetry Tags
      ctx.save();
      ctx.font = '9px "JetBrains Mono", monospace';
      for (const tag of cyberParticles) {
        tag.x += tag.vx;
        tag.y += tag.vy;

        if (tag.x < 0) tag.x = width;
        if (tag.x > width) tag.x = 0;
        if (tag.y < 0) tag.y = height;
        if (tag.y > height) tag.y = 0;

        ctx.fillStyle = `rgba(22, 191, 255, ${tag.alpha * 0.75})`;
        ctx.fillText(tag.text, tag.x, tag.y);
      }
      ctx.restore();

      // 5. Update Node Positions & Proximity Mesh Connections
      for (let i = 0; i < COUNT; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Mouse interaction: push nodes gently and illuminate
        if (mouse.isHovering) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const dist = Math.hypot(dx, dy);

          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (1 - dist / MOUSE_RADIUS) * 0.9;
            n.x -= (dx / dist) * force;
            n.y -= (dy / dist) * force;
          }
        }
      }

      // Draw Proximity Connections
      ctx.save();
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.28;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(22, 191, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 6. Draw Traveling Security Data Pulses
      ctx.save();
      for (const pkt of pulses) {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          pkt.progress = 0;
          pkt.from = Math.floor(Math.random() * COUNT);
          pkt.to = Math.floor(Math.random() * COUNT);
        }

        const n1 = nodes[pkt.from];
        const n2 = nodes[pkt.to];
        if (n1 && n2) {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < CONNECT_DIST * 1.35) {
            const px = n1.x + (n2.x - n1.x) * pkt.progress;
            const py = n1.y + (n2.y - n1.y) * pkt.progress;

            ctx.beginPath();
            ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
            ctx.fillStyle = '#16BFFF';
            ctx.shadowColor = '#16BFFF';
            ctx.shadowBlur = 10;
            ctx.fill();
          }
        }
      }
      ctx.restore();

      // 7. Draw Nodes with Sonar Rings for Sentinels
      ctx.save();
      for (let i = 0; i < COUNT; i++) {
        const n = nodes[i];
        const pulse = Math.sin(time * 0.002 + n.pulseOffset);
        const radius = n.baseRadius + pulse * 0.7;

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.col.hex;
        ctx.shadowColor = n.col.hex;
        ctx.shadowBlur = n.isSentinel ? 14 : 6;
        ctx.fill();

        // Sonar ripple rings for sentinel anchors
        if (n.isSentinel) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius + 5 + pulse * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${n.col.r}, ${n.col.g}, ${n.col.b}, 0.4)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();

      // 8. Cyber HUD Tactical Frame Brackets in Viewport Corners
      if (showHUD) {
        ctx.save();
        ctx.strokeStyle = 'rgba(22, 191, 255, 0.28)';
        ctx.lineWidth = 1.5;
        const bracketSize = isMobile ? 18 : 26;
        const pad = isMobile ? 16 : 24;

        // Top-Left Bracket
        ctx.beginPath();
        ctx.moveTo(pad, pad + bracketSize);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad + bracketSize, pad);
        ctx.stroke();

        // Top-Right Bracket
        ctx.beginPath();
        ctx.moveTo(width - pad - bracketSize, pad);
        ctx.lineTo(width - pad, pad);
        ctx.lineTo(width - pad, pad + bracketSize);
        ctx.stroke();

        // Bottom-Left Bracket
        ctx.beginPath();
        ctx.moveTo(pad, height - pad - bracketSize);
        ctx.lineTo(pad, height - pad);
        ctx.lineTo(pad + bracketSize, height - pad);
        ctx.stroke();

        // Bottom-Right Bracket
        ctx.beginPath();
        ctx.moveTo(width - pad - bracketSize, height - pad);
        ctx.lineTo(width - pad, height - pad);
        ctx.lineTo(width - pad, height - pad - bracketSize);
        ctx.stroke();

        // Tactical HUD Telemetry Labels
        if (!isMobile) {
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = 'rgba(22, 191, 255, 0.38)';
          ctx.textAlign = 'left';
          ctx.fillText('[+ PROTOCOL: ZERO_TRUST // SHA-256 +]', pad + 8, pad + 14);
          ctx.fillText('[+ DEFENSE: SENTINEL MESH ACTIVE +]', pad + 8, height - pad - 6);

          ctx.textAlign = 'right';
          ctx.fillText('[+ CLEARANCE: STRICT_LOCK // INVARIANTS +]', width - pad - 8, pad + 14);
          ctx.fillText('[+ BALANCEVAULT SEC_OPS v3.0 +]', width - pad - 8, height - pad - 6);
        }
        ctx.restore();
      }

      // 9. Interactive Cursor Glow Halo
      if (mouse.isHovering) {
        ctx.save();
        const cursorGlow = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 150
        );
        cursorGlow.addColorStop(0, 'rgba(22, 191, 255, 0.16)');
        cursorGlow.addColorStop(0.6, 'rgba(56, 123, 255, 0.05)');
        cursorGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = cursorGlow;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (!isTouch) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [nodeCount, showRadar, showGrid, showMatrix, showHUD, accentColor]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden select-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
