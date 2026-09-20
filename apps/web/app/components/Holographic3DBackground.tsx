"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Interactive 3D Holographic Particle Matrix Canvas
 * Renders a mathematical 3D perspective grid with rotating cryptographic nodes,
 * floating glowing particles, and interactive dynamic ray depth responding to cursor movement.
 */
export default function Holographic3DBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      setIsSupported(false);
      return;
    }

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize);

    // 3D Nodes configuration
    const NODE_COUNT = 48;
    interface Point3D {
      x: number;
      y: number;
      z: number;
      ox: number;
      oy: number;
      oz: number;
      size: number;
      speed: number;
      color: string;
    }

    const points: Point3D[] = [];
    const colors = ["#38bdf8", "#60a5fa", "#34d399", "#818cf8"];

    for (let i = 0; i < NODE_COUNT; i++) {
      const radius = 280 + Math.random() * 380;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      points.push({
        x,
        y,
        z,
        ox: x,
        oy: y,
        oz: z,
        size: 2 + Math.random() * 3,
        speed: 0.002 + Math.random() * 0.003,
        color: colors[i % colors.length]
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      // Smooth camera interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      angleY += 0.003;
      angleX = ((mouseY - height / 2) / height) * 0.4;
      const camYOffset = ((mouseX - width / 2) / width) * 0.5;

      ctx.clearRect(0, 0, width, height);

      // Subtle ambient 3D depth gradients
      const fov = 450;
      const centerX = width / 2;
      const centerY = height / 2 - 40;

      // Project 3D points to 2D
      const projected: { x: number; y: number; scale: number; p: Point3D; alpha: number }[] = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // 3D Rotation Y
        const cosY = Math.cos(angleY + camYOffset);
        const sinY = Math.sin(angleY + camYOffset);
        const x1 = p.ox * cosY - p.oz * sinY;
        const z1 = p.ox * sinY + p.oz * cosY;

        // 3D Rotation X
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y2 = p.oy * cosX - z1 * sinX;
        const z2 = p.oy * sinX + z1 * cosX;

        // Depth perspective calculation
        const depth = z2 + 650;
        if (depth > 20) {
          const scale = fov / depth;
          const x2d = centerX + x1 * scale;
          const y2d = centerY + y2 * scale;
          const alpha = Math.min(1, Math.max(0.15, (depth - 100) / 900));

          projected.push({
            x: x2d,
            y: y2d,
            scale,
            p,
            alpha
          });
        }
      }

      // Draw constellation connecting lines between nearest 3D nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          const distSq = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (distSq < 13000) {
            const lineAlpha = (1 - distSq / 13000) * 0.18 * a.alpha * b.alpha;
            ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw Glowing Nodes
      for (let i = 0; i < projected.length; i++) {
        const item = projected[i];
        const r = item.p.size * item.scale;

        // Node halo
        const gradient = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, r * 3);
        gradient.addColorStop(0, item.p.color);
        gradient.addColorStop(1, "rgba(56, 189, 248, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(item.x, item.y, Math.max(1, r * 2.8), 0, Math.PI * 2);
        ctx.fill();

        // Core light
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(item.x, item.y, Math.max(0.8, r * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}
      id="canvas-3d-holographic-matrix"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          opacity: 0.65
        }}
      />
      {/* 3D Horizon Vignette Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 30%, transparent 40%, rgba(6, 13, 23, 0.75) 85%, #060d17 100%)",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}
