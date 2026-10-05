import { useEffect, useRef } from "react";
import { drawCursorSpotlight } from "@/lib/cursorSpotlight";
import type { CursorTelemetryPoint } from "@/components/video-editor/types";

interface CursorSpotlightOverlayProps {
	enabled: boolean;
	telemetry: CursorTelemetryPoint[];
	currentTimeMs: number;
	width: number;
	height: number;
}

/**
 * MrRecorder Cursor Spotlight (preview) — dims the preview except for a
 * soft circle following the cursor. Uses the recording's cursor telemetry.
 */
export function CursorSpotlightOverlay({
	enabled,
	telemetry,
	currentTimeMs,
	width,
	height,
}: CursorSpotlightOverlayProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !enabled) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// find cursor position at current time (nearest telemetry sample)
		let cx = width / 2;
		let cy = height / 2;
		if (telemetry.length > 0) {
			let best = telemetry[0];
			let bestDist = Math.abs(best.timeMs - currentTimeMs);
			for (const p of telemetry) {
				const d = Math.abs(p.timeMs - currentTimeMs);
				if (d < bestDist) {
					bestDist = d;
					best = p;
				}
			}
			cx = best.cx * width;
			cy = best.cy * height;
		}

		ctx.clearRect(0, 0, width, height);
		drawCursorSpotlight(ctx, width, height, cx, cy);
	}, [enabled, telemetry, currentTimeMs, width, height]);

	if (!enabled) return null;

	return (
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			className="pointer-events-none absolute inset-0 z-10 h-full w-full"
		/>
	);
}
