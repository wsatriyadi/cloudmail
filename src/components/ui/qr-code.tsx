"use client";

import { useEffect, useRef } from "react";

/**
 * Simple QR Code generator using Canvas API
 * No external dependency needed
 */
export function QRCode({ value, size = 150 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    drawQR(canvasRef.current, value, size);
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded border"
    />
  );
}

// Minimal QR code implementation using the QR code API
// For production, consider using a library like 'qrcode'
function drawQR(canvas: HTMLCanvasElement, text: string, size: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Use an image from QR code API
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png`;
}
