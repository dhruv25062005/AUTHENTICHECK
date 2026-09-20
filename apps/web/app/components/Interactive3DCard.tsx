"use client";

import React, { useRef, useState } from "react";

interface Interactive3DCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  depth?: number;
  glowColor?: string;
  onClick?: () => void;
}

/**
 * 3D Dynamic Perspective Tilt Card with holographic specular sheen
 * Creates a responsive physical 3D reaction on mouse hover with realistic z-index elevation.
 */
export default function Interactive3DCard({
  children,
  className = "",
  style = {},
  id,
  depth = 14,
  glowColor = "rgba(56, 189, 248, 0.25)",
  onClick
}: Interactive3DCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rX = ((y - centerY) / centerY) * -depth;
    const rY = ((x - centerX) / centerX) * depth;

    setRotateX(rX);
    setRotateY(rY);

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;
    setGlarePosition({ x: glareX, y: glareY, opacity: 0.35 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      style={{
        perspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      <div
        ref={cardRef}
        id={id}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`interactive-3d-card ${className}`}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0px)`,
          transition: rotateX === 0 && rotateY === 0 ? "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)" : "transform 0.08s ease-out",
          transformStyle: "preserve-3d",
          position: "relative",
          cursor: onClick ? "pointer" : "default",
          ...style
        }}
      >
        {/* Holographic dynamic light sweep reflection */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, ${glowColor} 0%, transparent 65%)`,
            opacity: glarePosition.opacity,
            transition: "opacity 0.25s ease-out",
            zIndex: 10
          }}
        />
        {/* Child content with z-axis depth */}
        <div style={{ transform: "translateZ(12px)", transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
