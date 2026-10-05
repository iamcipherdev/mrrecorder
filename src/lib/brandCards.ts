/**
 * MrRecorder branded intro/outro cards.
 * Renders title cards in the MrRecorder brand style (warm cream, deep black,
 * peach accent) onto an offscreen canvas and returns PNG data URLs.
 */

export interface BrandCardOptions {
	title: string;
	subtitle?: string;
	width: number;
	height: number;
	/** seconds each card stays on screen (used by the ffmpeg concat step) */
	durationSec?: number;
}

const CREAM = "#F5F0E8";
const INK = "#141414";
const MUTED = "#5A554B";
const PEACH = "#E08A4A";

function drawCard(
	ctx: CanvasRenderingContext2D,
	opts: BrandCardOptions,
	kind: "intro" | "outro",
): void {
	const { width, height, title, subtitle } = opts;
	// background
	ctx.fillStyle = CREAM;
	ctx.fillRect(0, 0, width, height);
	// top + bottom accent bars
	const barH = Math.max(10, Math.round(height * 0.02));
	ctx.fillStyle = PEACH;
	ctx.fillRect(0, 0, width, barH);
	ctx.fillRect(0, height - barH, width, barH);

	// record dot for intro
	if (kind === "intro") {
		const r = Math.max(14, Math.round(Math.min(width, height) * 0.03));
		ctx.fillStyle = "#E53946";
		ctx.beginPath();
		ctx.arc(width / 2, height * 0.32, r, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// title
	const titleSize = Math.round(Math.min(width, height) * 0.09);
	ctx.fillStyle = INK;
	ctx.font = `700 ${titleSize}px Georgia, 'Times New Roman', serif`;
	const titleY = kind === "intro" ? height * 0.52 : height * 0.46;
	fitAndDrawTitle(ctx, title, width * 0.86, titleY, titleSize);

	// subtitle
	if (subtitle) {
		const subSize = Math.round(Math.min(width, height) * 0.045);
		ctx.fillStyle = MUTED;
		ctx.font = `${subSize}px Georgia, serif`;
		ctx.fillText(subtitle, width / 2, titleY + titleSize * 1.1, width * 0.86);
	}

	// footer brand line
	const footSize = Math.round(Math.min(width, height) * 0.035);
	ctx.fillStyle = PEACH;
	ctx.font = `${footSize}px system-ui, sans-serif`;
	ctx.fillText("made with MrRecorder", width / 2, height - barH - footSize * 2);
}

function fitAndDrawTitle(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
	y: number,
	baseSize: number,
): void {
	let size = baseSize;
	ctx.font = `700 ${size}px Georgia, 'Times New Roman', serif`;
	while (ctx.measureText(text).width > maxWidth && size > 12) {
		size -= 2;
		ctx.font = `700 ${size}px Georgia, 'Times New Roman', serif`;
	}
	ctx.fillText(text, ctx.canvas.width / 2, y, maxWidth);
}

/** Renders an intro card and returns a PNG data URL. */
export function renderIntroCard(opts: BrandCardOptions): string {
	const canvas = document.createElement("canvas");
	canvas.width = opts.width;
	canvas.height = opts.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get 2d canvas context");
	drawCard(ctx, opts, "intro");
	return canvas.toDataURL("image/png");
}

/** Renders an outro card and returns a PNG data URL. */
export function renderOutroCard(opts: BrandCardOptions): string {
	const canvas = document.createElement("canvas");
	canvas.width = opts.width;
	canvas.height = opts.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get 2d canvas context");
	drawCard(ctx, opts, "outro");
	return canvas.toDataURL("image/png");
}
