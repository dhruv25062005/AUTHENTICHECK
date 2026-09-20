"use client";

import { useEffect, useRef } from "react";

interface HologramBadge3DProps {
  status: "GENUINE" | "SUSPICIOUS" | "RISK";
  score: number;
}

/**
 * 3D Hologram Security Seal Canvas
 * Renders a rotating 3D isometric metallic security coin with holographic diffraction,
 * micro-engraved optical guilloche patterns, and dynamic rainbow refraction.
 */
export default function HologramBadge3D({ status, score }: HologramBadge3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const colors = {
    GENUINE: {
      primary: "#10b981",
      secondary: "#34d399",
      ambient: "rgba(16, 185, 129, 0.2)",
      text: "#a7f3d0"
    },
    SUSPICIOUS: {
      primary: "#f59e0b",
      secondary: "#fbbf24",
      ambient: "rgba(245, 158, 11, 0.2)",
      text: "#fde68a"
    },
    RISK: {
      primary: "#f43f5e",
      secondary: "#fb7185",
      ambient: "rgba(244, 63, 94, 0.2)",
      text: "#fecdd3"
    }
  }[status];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const size = 160;
    canvas.width = size * 2;
    canvas.height = size * 2;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(2, 2);

      const cx = size / 2;
      const cy = size / 2;
      const r = 58;

      angle += 0.02;

      // Outer 3D Coin Rim Gradient with lighting angle
      const lightX = cx + Math.cos(angle) * r;
      const lightY = cy + Math.sin(angle) * r;

      const rimGrad = ctx.createRadialGradient(lightX, lightY, 5, cx, cy, r + 8);
      rimGrad.addColorStop(0, colors.secondary);
      rimGrad.addColorStop(0.5, "#1e293b");
      rimGrad.addColorStop(1, "#090d16");

      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = 18;
      ctx.fill();

      // Optical Guilloche Pattern (anti-counterfeiting security lathe)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Holographic Rainbow Sheen Background
      const holoGrad = ctx.createLinearGradient(
        cx + Math.cos(angle * 1.5) * r,
        cy + Math.sin(angle * 1.5) * r,
        cx - Math.cos(angle * 1.5) * r,
        cy - Math.sin(angle * 1.5) * r
      );
      holoGrad.addColorStop(0, "rgba(56, 189, 248, 0.35)");
      holoGrad.addColorStop(0.25, "rgba(168, 85, 247, 0.35)");
      holoGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.35)");
      holoGrad.addColorStop(0.75, "rgba(34, 197, 94, 0.35)");
      holoGrad.addColorStop(1, "rgba(234, 179, 8, 0.35)");

      ctx.fillStyle = "#0c1524";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      ctx.fillStyle = holoGrad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      // Micro-security spirograph curves
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI * 2) / 24 + angle * 0.3;
        const x1 = cx + Math.cos(a) * (r * 0.85);
        const y1 = cy + Math.sin(a) * (r * 0.85);
        const x2 = cx + Math.cos(a + Math.PI * 0.8) * (r * 0.45);
        const y2 = cy + Math.sin(a + Math.PI * 0.8) * (r * 0.45);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx, cy, cx, cy, x2, y2);
        ctx.stroke();
      }

      ctx.restore();

      // Inner Metallic Core
      const innerGrad = ctx.createRadialGradient(cx - 10, cy - 10, 2, cx, cy, 38);
      innerGrad.addColorStop(0, "#1e293b");
      innerGrad.addColorStop(0.7, "#0f172a");
      innerGrad.addColorStop(1, "#020617");

      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.primary;
      ctx.stroke();

      // Center Security Holographic Emblem
      ctx.fillStyle = colors.text;
      ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(status === "GENUINE" ? "VERIFIED" : status === "SUSPICIOUS" ? "ALERT" : "INVALID", cx, cy - 8);

      ctx.font = "800 11px ui-monospace, monospace";
      ctx.fillStyle = colors.secondary;
      ctx.fillText(`${score}/100`, cx, cy + 10);

      // Specular 3D light reflection glint
      ctx.save();
      ctx.beginPath();
      const glintX = cx + Math.cos(angle * 2) * 24;
      const glintY = cy + Math.sin(angle * 2) * 24;
      const glintGrad = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, 18);
      glintGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      glintGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glintGrad;
      ctx.arc(glintX, glintY, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [colors, score, status]);

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
      }}
      id="security-hologram-seal-3d"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "160px",
          height: "160px",
          display: "block",
          filter: "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.6))"
        }}
      />
      <span
        style={{
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.secondary,
          fontWeight: 700,
          marginTop: "-6px"
        }}
      >
        Tamper-Evident Hologram
      </span>
    </div>
  );
}
