"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Shield, RotateCw, Eye } from "lucide-react";

interface Product3DShowcaseProps {
  productName?: string;
  brand?: string;
  category?: string;
  serialNumber?: string;
  isGenuine?: boolean;
}

/**
 * Interactive 3D Wireframe Product Inspection Stage
 * Features a real-time rotating 3D cryptographic product asset,
 * laser scan plane, inspection nodes, and drag-to-rotate interaction.
 */
export default function Product3DShowcase({
  productName = "Aura Chronograph Ref. 101",
  brand = "Aura Horology",
  category = "Luxury Watches",
  serialNumber = "AC-DEMO-001",
  isGenuine = true
}: Product3DShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanLaserY, setScanLaserY] = useState(0);
  const [wireframeMode, setWireframeMode] = useState<"CRYPTO" | "OPTICAL">("CRYPTO");

  const lastMousePos = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.35, y: 0.45 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let laserProgress = 0;
    const size = 320;
    canvas.width = size * 2;
    canvas.height = size * 2;

    // Define 3D Mesh vertices for a luxury timepiece / certified asset
    const vertices: { x: number; y: number; z: number }[] = [];
    const edges: [number, number][] = [];

    // Outer cylindrical bezel ring
    const segments = 16;
    const rOuter = 70;
    const rInner = 52;
    const h = 24;

    for (let i = 0; i < segments; i++) {
      const a = (i * Math.PI * 2) / segments;
      // Top outer
      vertices.push({ x: Math.cos(a) * rOuter, y: -h, z: Math.sin(a) * rOuter });
      // Bottom outer
      vertices.push({ x: Math.cos(a) * rOuter, y: h, z: Math.sin(a) * rOuter });
      // Top inner dial
      vertices.push({ x: Math.cos(a) * rInner, y: -h + 6, z: Math.sin(a) * rInner });
      // Bottom inner
      vertices.push({ x: Math.cos(a) * rInner, y: h - 6, z: Math.sin(a) * rInner });
    }

    // Connect rings
    for (let i = 0; i < segments; i++) {
      const base = i * 4;
      const next = ((i + 1) % segments) * 4;

      edges.push([base, base + 1]); // Outer vertical
      edges.push([base, next]); // Top outer ring
      edges.push([base + 1, next + 1]); // Bottom outer ring
      edges.push([base + 2, next + 2]); // Top inner dial ring
      edges.push([base, base + 2]); // Bezel chamfer
    }

    // Watch crown
    const crownIdx = vertices.length;
    vertices.push({ x: rOuter + 14, y: -4, z: 0 });
    vertices.push({ x: rOuter + 14, y: 4, z: 0 });
    edges.push([0, crownIdx]);
    edges.push([crownIdx, crownIdx + 1]);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(2, 2);

      const cx = size / 2;
      const cy = size / 2;

      // Auto rotation if not dragging
      if (!isDragging) {
        rotation.current.y += 0.01;
      }

      laserProgress = (laserProgress + 0.015) % 1;
      const currentLaserY = cy - 70 + laserProgress * 140;
      setScanLaserY(currentLaserY);

      // Project vertices
      const fov = 380;
      const cosY = Math.cos(rotation.current.y);
      const sinY = Math.sin(rotation.current.y);
      const cosX = Math.cos(rotation.current.x);
      const sinX = Math.sin(rotation.current.x);

      const projected: { x: number; y: number; z: number; origY: number }[] = [];

      for (let i = 0; i < vertices.length; i++) {
        const v = vertices[i];

        // Rotate Y
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;

        // Rotate X
        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;

        const depth = z2 + 400;
        const scale = fov / depth;
        projected.push({
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          origY: cy + y2 * scale
        });
      }

      // Draw 3D Ground Elevation Pedestal Shadow
      const shadowGrad = ctx.createRadialGradient(cx, cy + 90, 10, cx, cy + 90, 80);
      shadowGrad.addColorStop(0, "rgba(56, 189, 248, 0.25)");
      shadowGrad.addColorStop(1, "rgba(6, 13, 23, 0)");
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 90, 80, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw laser scanning beam across 3D object
      ctx.save();
      const laserGrad = ctx.createLinearGradient(cx - 90, currentLaserY, cx + 90, currentLaserY);
      laserGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
      laserGrad.addColorStop(0.5, isGenuine ? "rgba(56, 189, 248, 0.85)" : "rgba(244, 63, 94, 0.85)");
      laserGrad.addColorStop(1, "rgba(56, 189, 248, 0)");

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 2;
      ctx.shadowColor = isGenuine ? "#38bdf8" : "#f43f5e";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - 90, currentLaserY);
      ctx.lineTo(cx + 90, currentLaserY);
      ctx.stroke();
      ctx.restore();

      // Draw Edges
      ctx.lineWidth = wireframeMode === "CRYPTO" ? 1.4 : 1.0;
      for (let i = 0; i < edges.length; i++) {
        const [a, b] = edges[i];
        const p1 = projected[a];
        const p2 = projected[b];
        if (!p1 || !p2) continue;

        // Proximity to laser creates glowing pulse
        const midY = (p1.y + p2.y) / 2;
        const distLaser = Math.abs(midY - currentLaserY);
        const isNearLaser = distLaser < 16;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        if (isNearLaser) {
          ctx.strokeStyle = isGenuine ? "#38bdf8" : "#fb7185";
          ctx.lineWidth = 2.2;
        } else {
          ctx.strokeStyle =
            wireframeMode === "CRYPTO"
              ? "rgba(56, 189, 248, 0.35)"
              : "rgba(148, 163, 184, 0.4)";
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();
      }

      // Draw Verification Vertices Nodes
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = isGenuine ? "#34d399" : "#f43f5e";
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isDragging, isGenuine, wireframeMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    rotation.current.y += dx * 0.01;
    rotation.current.x = Math.max(-0.8, Math.min(0.8, rotation.current.x + dy * 0.01));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(17, 34, 57, 0.8), rgba(6, 13, 23, 0.95))",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        borderRadius: "16px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      }}
      id="product-3d-stage-card"
    >
      {/* 3D Grid background lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none"
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
        <div>
          <div className="badge-tag" style={{ fontSize: "11px", padding: "4px 8px" }}>
            <Sparkles className="w-3.5 h-3.5 text-sky-400 mr-1" />
            <span>3D Forensic Twin</span>
          </div>
          <h3 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", marginTop: "6px" }}>
            {productName}
          </h3>
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>
            {brand} • {category} • Serial: <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{serialNumber}</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setWireframeMode(wireframeMode === "CRYPTO" ? "OPTICAL" : "CRYPTO")}
            style={{
              padding: "6px 10px",
              fontSize: "11px",
              borderRadius: "6px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            id="btn-toggle-wireframe"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{wireframeMode} Mode</span>
          </button>
        </div>
      </div>

      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none"
        }}
        id="canvas-3d-model-wrapper"
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "320px",
            height: "320px",
            display: "block"
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "11px",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(6, 13, 23, 0.7)",
            padding: "4px 10px",
            borderRadius: "9999px",
            border: "1px solid var(--border-dim)"
          }}
        >
          <RotateCw className="w-3 h-3 text-sky-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span>Click & drag to rotate 3D geometry</span>
        </div>
      </div>
    </div>
  );
}
