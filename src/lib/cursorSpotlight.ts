/**
 * MrRecorder Cursor Spotlight — dims the whole frame except a soft
 * circular area around the cursor, which follows it smoothly.
 * Works on any 2D canvas context (preview + export share this).
 */
export function drawCursorSpotlight(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	cursorX: number,
	cursorY: number,
	options?: {
		radius?: number;
		dimAlpha?: number;
	},
): void {
	const radius = options?.radius ?? Math.min(width, height) * 0.18;
	const dimAlpha = options?.dimAlpha ?? 0.55;

	ctx.save();

	// Dim everything
	ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha})`;
	ctx.fillRect(0, 0, width, height);

	// Punch a soft circular hole around the cursor using destination-out
	ctx.globalCompositeOperation = "destination-out";
	const gradient = ctx.createRadialGradient(cursorX, cursorY, radius * 0.35, cursorX, cursorY, radius);
	gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
	gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.9)");
	gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.arc(cursorX, cursorY, radius, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}
