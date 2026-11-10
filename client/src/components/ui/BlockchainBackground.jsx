import React, { useEffect, useRef } from 'react';

/**
 * BlockchainBackground Component
 * 
 * An ultra-unique, high-performance Canvas-based cryptographic blockchain visualization:
 * - 3D Isometric floating ledger blocks linked with glowing SHA-256 hash chains
 * - Energy data pulses traveling across blocks representing transaction validation
 * - Dynamic block headers with Merkle proofs, block numbers, and cryptographic tags
 * - Hexagonal digital mesh & perspective depth grid
 * - Interactive cursor magnetic tilt and hover pulse
 * - Automatic HiDPI scaling, low CPU footprint, and reduced-motion compliance
 */
export default function BlockchainBackground({ opacity = 0.85, interactive = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check motion preference and device capabilities
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Mouse state with smooth damping
    const mouse = { x: -1000, y: -1000, targetX: 0, targetY: 0, active: false };

    // Resize handler with HiDPI support
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
      if (!interactive || isTouch) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouse.targetX = (x / width - 0.5) * 35; // max tilt in px
      mouse.targetY = (y / height - 0.5) * 25;
      mouse.x = x;
      mouse.y = y;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
      mouse.active = false;
    };

    if (interactive && !isTouch) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseleave', handleMouseLeave);
    }

    // -------------------------------------------------------------
    // BLOCKCHAIN ENTITIES SETUP
    // -------------------------------------------------------------
    // Define an interconnected chain of 5 cryptographic blocks across the viewport
    const generateChainBlocks = () => {
      const isMobile = width < 768;
      const blockCount = isMobile ? 4 : 6;
      const blocks = [];

      const hashes = [
        { hash: '0x7f2a...8c1b', merkle: 'ROOT#1044', blk: '1044', status: 'GENESIS' },
        { hash: '0x3e1d...9f42', merkle: 'ROOT#1045', blk: '1045', status: 'VALIDATED' },
        { hash: '0x8b5c...e210', merkle: 'ROOT#1046', blk: '1046', status: 'CONFIRMED' },
        { hash: '0x2dff...9a00', merkle: 'ROOT#1047', blk: '1047', status: 'COMMITTED' },
        { hash: '0x06b6...d4ff', merkle: 'ROOT#1048', blk: '1048', status: 'COMMITTED' },
        { hash: '0x52ff...ab12', merkle: 'ROOT#1049', blk: '1049', status: 'HEAD_LOCKED' },
      ];

      for (let i = 0; i < blockCount; i++) {
        // Curve the chain in an elegant cyber-S layout across the background
        const progress = i / (blockCount - 1);
        const baseX = isMobile
          ? width * 0.15 + progress * (width * 0.7)
          : width * 0.08 + progress * (width * 0.84);
        const baseY = isMobile
          ? height * 0.2 + progress * (height * 0.6)
          : height * 0.28 + Math.sin(progress * Math.PI * 1.5) * (height * 0.24) + (progress * height * 0.28);

        const data = hashes[i % hashes.length];

        blocks.push({
          id: i,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
          width: isMobile ? 95 : 130,
          height: isMobile ? 65 : 85,
          depth: isMobile ? 18 : 26,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: 0.0015 + Math.random() * 0.001,
          floatAmp: isMobile ? 6 : 10,
          data,
          glowIntensity: 0.35 + (i === blockCount - 1 ? 0.45 : 0),
          highlight: i === blockCount - 2 || i === blockCount - 1,
        });
      }
      return blocks;
    };

    let blocks = generateChainBlocks();

    // Data energy packets flowing along the chain links
    const packets = [];
    const PACKET_COUNT = width < 768 ? 6 : 14;
    for (let p = 0; p < PACKET_COUNT; p++) {
      packets.push({
        segmentIndex: Math.floor(Math.random() * (blocks.length - 1)),
        progress: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
        size: Math.random() * 2.5 + 1.5,
        color: Math.random() > 0.3 ? '#2dff9a' : '#06b6d4',
      });
    }

    // Ambient floating cryptographic hash particles in deep space
    const particles = [];
    const PARTICLE_COUNT = width < 768 ? 20 : 45;
    const cryptoSymbols = ['0x1', 'SHA-256', 'Σ=0', 'FOR UPDATE', 'PAISE', 'NONCE', 'CHK_OVERDRAFT', '0x0'];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        text: cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)],
        opacity: Math.random() * 0.28 + 0.08,
        size: Math.random() * 2 + 9,
      });
    }

    // Draw an isometric 3D-styled block with glowing borders
    const drawIsometricBlock = (block, time, tiltX, tiltY) => {
      const bx = block.x + tiltX;
      const by = block.y + tiltY + Math.sin(time * block.floatSpeed + block.floatOffset) * block.floatAmp;
      const bw = block.width;
      const bh = block.height;
      const depth = block.depth;

      // Check distance to mouse for hover highlight
      const distToMouse = Math.hypot(bx + bw / 2 - mouse.x, by + bh / 2 - mouse.y);
      const isHovered = distToMouse < 130;
      const currentGlow = isHovered ? 0.9 : block.glowIntensity;

      // 1. Block Shadow Glow
      const shadowGrad = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 10, bx + bw / 2, by + bh / 2, bw);
      shadowGrad.addColorStop(0, block.highlight ? 'rgba(45, 255, 154, 0.12)' : 'rgba(6, 182, 212, 0.08)');
      shadowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(bx - 30, by - 30, bw + 60, bh + 60);

      // 2. Isometric Top Face
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + depth * 0.7, by - depth * 0.6);
      ctx.lineTo(bx + bw + depth * 0.7, by - depth * 0.6);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fillStyle = block.highlight
        ? 'rgba(45, 255, 154, 0.07)'
        : 'rgba(7, 24, 18, 0.45)';
      ctx.fill();
      ctx.strokeStyle = block.highlight
        ? `rgba(45, 255, 154, ${currentGlow * 0.8})`
        : `rgba(60, 255, 160, ${currentGlow * 0.35})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 3. Isometric Right Side Face
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(bx + bw, by);
      ctx.lineTo(bx + bw + depth * 0.7, by - depth * 0.6);
      ctx.lineTo(bx + bw + depth * 0.7, by + bh - depth * 0.6);
      ctx.lineTo(bx + bw, by + bh);
      ctx.closePath();
      ctx.fillStyle = block.highlight
        ? 'rgba(45, 255, 154, 0.04)'
        : 'rgba(3, 15, 10, 0.65)';
      ctx.fill();
      ctx.strokeStyle = block.highlight
        ? `rgba(45, 255, 154, ${currentGlow * 0.6})`
        : `rgba(60, 255, 160, ${currentGlow * 0.25})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 4. Front Glass Face (Main Surface)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fillStyle = block.highlight
        ? 'rgba(6, 20, 14, 0.85)'
        : 'rgba(4, 12, 8, 0.8)';
      ctx.fill();

      // Glowing border
      ctx.strokeStyle = block.highlight
        ? `rgba(45, 255, 154, ${currentGlow})`
        : isHovered
        ? 'rgba(45, 255, 154, 0.75)'
        : `rgba(60, 255, 160, ${currentGlow * 0.4})`;
      ctx.lineWidth = block.highlight || isHovered ? 1.5 : 1;
      ctx.shadowColor = block.highlight ? '#2dff9a' : '#06b6d4';
      ctx.shadowBlur = isHovered ? 15 : block.highlight ? 10 : 4;
      ctx.stroke();
      ctx.restore();

      // 5. Corner Accent Highlights
      ctx.save();
      const cornerSize = 5;
      ctx.strokeStyle = '#2dff9a';
      ctx.lineWidth = 1.8;
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(bx, by + cornerSize);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + cornerSize, by);
      ctx.stroke();
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(bx + bw - cornerSize, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.lineTo(bx + bw, by + bh - cornerSize);
      ctx.stroke();
      ctx.restore();

      // 6. Block Content Text / Labels (Monospace Cryptographic Data)
      ctx.save();
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = block.highlight ? '#2dff9a' : '#7ea594';
      ctx.fillText(`BLOCK #${block.data.blk}`, bx + 8, by + 16);

      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#9abfb0';
      ctx.fillText(block.data.hash, bx + 8, by + 30);

      // Status pill inside block
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.fillStyle = block.highlight ? '#2dff9a' : '#06b6d4';
      ctx.fillText(`[ ${block.data.status} ]`, bx + 8, by + 44);

      if (bh > 70) {
        ctx.fillStyle = 'rgba(126, 165, 148, 0.6)';
        ctx.fillText(`MK: ${block.data.merkle}`, bx + 8, by + 57);
      }
      ctx.restore();

      return { cx: bx + bw / 2, cy: by + bh / 2, bx, by, bw, bh };
    };

    // -------------------------------------------------------------
    // MAIN RENDER LOOP
    // -------------------------------------------------------------
    let startTime = performance.now();

    const render = (now) => {
      const elapsed = now - startTime;

      // Handle tab visibility (skip when hidden)
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // Smooth mouse lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;
      const tiltX = mouse.x;
      const tiltY = mouse.y;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle background cyber perspective grid lines
      ctx.save();
      ctx.strokeStyle = 'rgba(45, 255, 154, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 70;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + tiltX * 0.2, 0);
        ctx.lineTo(x + tiltX * 0.2, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + tiltY * 0.2);
        ctx.lineTo(width, y + tiltY * 0.2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Floating Cryptographic Background Particles
      ctx.save();
      ctx.font = '9px "JetBrains Mono", monospace';
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(45, 255, 154, ${p.opacity * 0.4})`;
        ctx.fillText(p.text, p.x + tiltX * 0.15, p.y + tiltY * 0.15);
      }
      ctx.restore();

      // 3. Calculate Centers of all Blocks
      const renderedCenters = [];
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const by = b.y + tiltY + Math.sin(elapsed * b.floatSpeed + b.floatOffset) * b.floatAmp;
        const bx = b.x + tiltX;
        renderedCenters.push({
          x: bx + b.width / 2,
          y: by + b.height / 2,
          bx,
          by,
          bw: b.width,
          bh: b.height,
        });
      }

      // 4. Draw Connecting Laser Hash-Chains between Blocks
      ctx.save();
      for (let i = 0; i < renderedCenters.length - 1; i++) {
        const c1 = renderedCenters[i];
        const c2 = renderedCenters[i + 1];

        // Primary hash chain line
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.strokeStyle = 'rgba(45, 255, 154, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();

        // Subtle outer laser glow
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.strokeStyle = 'rgba(45, 255, 154, 0.08)';
        ctx.lineWidth = 5;
        ctx.setLineDash([]);
        ctx.stroke();

        // Mid-point SHA-256 Link Tag
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        ctx.fillStyle = 'rgba(7, 24, 18, 0.7)';
        ctx.beginPath();
        ctx.arc(midX, midY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(45, 255, 154, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.fillStyle = '#2dff9a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛓', midX, midY);
      }
      ctx.restore();

      // 5. Draw Traveling Energy Packets
      ctx.save();
      for (const pkt of packets) {
        if (pkt.segmentIndex >= renderedCenters.length - 1) {
          pkt.segmentIndex = 0;
          pkt.progress = 0;
        }

        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          pkt.progress = 0;
          pkt.segmentIndex = (pkt.segmentIndex + 1) % (renderedCenters.length - 1);
        }

        const from = renderedCenters[pkt.segmentIndex];
        const to = renderedCenters[pkt.segmentIndex + 1];

        if (from && to) {
          const px = from.x + (to.x - from.x) * pkt.progress;
          const py = from.y + (to.y - from.y) * pkt.progress;

          // Packet core
          ctx.beginPath();
          ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
          ctx.fillStyle = pkt.color;
          ctx.shadowColor = pkt.color;
          ctx.shadowBlur = 8;
          ctx.fill();

          // Packet trailing tail
          const tailLen = 0.05;
          const tailProgress = Math.max(0, pkt.progress - tailLen);
          const tx = from.x + (to.x - from.x) * tailProgress;
          const ty = from.y + (to.y - from.y) * tailProgress;

          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = pkt.color;
          ctx.lineWidth = pkt.size * 0.7;
          ctx.stroke();
        }
      }
      ctx.restore();

      // 6. Draw 3D Isometric Blocks on Top of Lines
      for (let i = 0; i < blocks.length; i++) {
        drawIsometricBlock(blocks[i], elapsed, tiltX, tiltY);
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // If reduced motion is requested, render once and stop
    if (prefersReducedMotion) {
      render(0);
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (interactive && !isTouch) {
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [interactive]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      style={{ opacity }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
