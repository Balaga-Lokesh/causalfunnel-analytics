'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HeatmapLayout } from './layout';

export type RenderMode = 'dots' | 'heat';

interface Props {
  layout: HeatmapLayout;
  pageUrl: string;
  mode: RenderMode;
  showPage: boolean;
  label: string;
}

// Marker sizes in on-screen CSS px, so they stay readable however small the page is scaled.
const DOT_RADIUS = 6;
const HEAT_RADIUS = 22;

/** 256-entry RGB lookup: transparent blue → cyan → green → yellow → red. */
function buildPalette(): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0.0, '#3b82f6');
  gradient.addColorStop(0.35, '#06b6d4');
  gradient.addColorStop(0.55, '#22c55e');
  gradient.addColorStop(0.75, '#facc15');
  gradient.addColorStop(1.0, '#ef4444');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);
  return ctx.getImageData(0, 0, 256, 1).data;
}

let palette: Uint8ClampedArray | null = null;

function drawDots(ctx: CanvasRenderingContext2D, layout: HeatmapLayout, unit: number, dpr: number) {
  ctx.fillStyle = 'rgba(244, 63, 94, 0.6)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 1.5 * dpr;
  for (const p of layout.points) {
    ctx.beginPath();
    ctx.arc(p.x * unit, p.y * unit, DOT_RADIUS * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** Classic heatmap: accumulate soft alpha blobs, then colorize by intensity. */
function drawHeat(ctx: CanvasRenderingContext2D, layout: HeatmapLayout, unit: number, dpr: number) {
  const { width, height } = ctx.canvas;
  const radius = HEAT_RADIUS * dpr;

  // Each blob adds a little; overlapping clicks get hotter. Fewer clicks → stronger blobs so a few are still visible.
  const strength = Math.min(0.6, Math.max(0.12, 6 / Math.sqrt(layout.points.length || 1)));
  for (const p of layout.points) {
    const x = p.x * unit;
    const y = p.y * unit;
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  palette ??= buildPalette();
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!;
    if (alpha === 0) continue;
    const offset = alpha * 4;
    data[i] = palette[offset]!;
    data[i + 1] = palette[offset + 1]!;
    data[i + 2] = palette[offset + 2]!;
    data[i + 3] = Math.min(220, 60 + alpha);
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Draws click positions over a scaled-down, non-interactive preview of the page.
 * The canvas is sized in device pixels so dots stay crisp on high-DPI screens.
 */
export function HeatmapCanvas({ layout, pageUrl, mode, showPage, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [frameFailed, setFrameFailed] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => setFrameFailed(false), [pageUrl]);

  const scale = containerWidth ? Math.min(1, containerWidth / layout.width) : 0;
  const displayWidth = layout.width * scale;
  const displayHeight = layout.height * scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scale) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);
    const ctx = canvas.getContext('2d', { willReadFrequently: mode === 'heat' });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // One "unit" = one CSS pixel of the reference page, in canvas pixels.
    const unit = scale * dpr;
    if (mode === 'dots') drawDots(ctx, layout, unit, dpr);
    else drawHeat(ctx, layout, unit, dpr);
  }, [layout, mode, scale, displayWidth, displayHeight]);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-md border border-zinc-200 bg-[repeating-linear-gradient(45deg,var(--color-zinc-50),var(--color-zinc-50)_10px,var(--color-white)_10px,var(--color-white)_20px)]"
        style={{ width: displayWidth || '100%', height: displayHeight || 320 }}
      >
        {showPage && scale > 0 && !frameFailed && (
          <iframe
            key={pageUrl}
            src={pageUrl}
            title={`Preview of ${pageUrl}`}
            // No scripts: the preview must not run the page's tracker (that would log fake page views).
            sandbox=""
            loading="lazy"
            tabIndex={-1}
            aria-hidden="true"
            onError={() => setFrameFailed(true)}
            className="pointer-events-none absolute top-0 left-0 origin-top-left border-0 bg-white"
            style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
          />
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          className="absolute inset-0"
          style={{ width: displayWidth, height: displayHeight }}
        />
      </div>
      {scale > 0 && scale < 1 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Page shown at {Math.round(scale * 100)}% of its {layout.width}px layout width.
        </p>
      )}
    </div>
  );
}
