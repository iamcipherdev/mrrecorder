import type { ExportFormat, ExportMp4FrameRate, ExportQuality } from "@/lib/exporter/types";
import type { AspectRatio } from "@/utils/aspectRatioUtils";

export interface ExportPreset {
	id: "youtube" | "instagram" | "tiktok";
	label: string;
	description: string;
	aspectRatio: AspectRatio;
	format: ExportFormat;
	quality: ExportQuality;
	frameRate: ExportMp4FrameRate;
}

export const EXPORT_PRESETS: ExportPreset[] = [
	{
		id: "youtube",
		label: "YouTube",
		description: "16:9 landscape, high quality",
		aspectRatio: "16:9",
		format: "mp4",
		quality: "high",
		frameRate: 30,
	},
	{
		id: "instagram",
		label: "Instagram Reel",
		description: "9:16 vertical, high quality",
		aspectRatio: "9:16",
		format: "mp4",
		quality: "high",
		frameRate: 30,
	},
	{
		id: "tiktok",
		label: "TikTok",
		description: "9:16 vertical, high quality",
		aspectRatio: "9:16",
		format: "mp4",
		quality: "high",
		frameRate: 30,
	},
];

/**
 * Applies the export-settings half of a preset (format/quality/fps).
 * The aspect-ratio half is applied by the caller via setAspectRatio.
 * Communicates via window event so toolbar and export settings stay decoupled.
 */
export function applyExportPresetSettings(preset: ExportPreset): void {
	window.dispatchEvent(
		new CustomEvent<ExportPreset>("mrrecorder:apply-export-preset", { detail: preset }),
	);
}
