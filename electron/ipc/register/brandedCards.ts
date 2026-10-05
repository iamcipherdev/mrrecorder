import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ipcMain } from "electron";
import { getFfmpegBinaryPath } from "../ffmpeg/binary";

export interface BrandedCardsRequest {
	/** Absolute path to the exported MP4 */
	videoPath: string;
	/** PNG data URL for the intro card (optional) */
	introDataUrl?: string;
	/** PNG data URL for the outro card (optional) */
	outroDataUrl?: string;
	/** Seconds each card is shown */
	cardDurationSec?: number;
}

export interface BrandedCardsResult {
	success: boolean;
	outputPath?: string;
	error?: string;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
	const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
	if (!match) throw new Error("Invalid PNG data URL");
	return Buffer.from(match[1], "base64");
}

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn(ffmpegPath, args, { windowsHide: true });
		let stderr = "";
		proc.stderr?.on("data", (d) => {
			stderr += d.toString();
		});
		proc.on("error", reject);
		proc.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
		});
	});
}

/**
 * Prepends/appends MrRecorder branded title cards to an exported video.
 * Produces a NEW file next to the original (never overwrites).
 */
export function registerBrandedCardsHandlers() {
	ipcMain.handle(
		"mrrecorder:add-branded-cards",
		async (_, req: BrandedCardsRequest): Promise<BrandedCardsResult> => {
			try {
				const { videoPath, introDataUrl, outroDataUrl } = req;
				if (!introDataUrl && !outroDataUrl) {
					return { success: false, error: "No cards provided" };
				}
				const cardDurationSec = Math.min(
					10,
					Math.max(1, req.cardDurationSec ?? 2),
				);

				let ffmpegPath: string;
				try {
					ffmpegPath = getFfmpegBinaryPath();
				} catch {
					return {
						success: false,
						error: "ffmpeg not found — install ffmpeg to use branded cards",
					};
				}

				const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mrrecorder-cards-"));
				const inputs: string[] = [];
				const filterParts: string[] = [];
				let inputIndex = 0;

				// Build a looping clip for each card image
				for (const [label, dataUrl] of [
					["intro", introDataUrl],
					["outro", outroDataUrl],
				] as const) {
					if (!dataUrl) continue;
					const pngPath = path.join(tmpDir, `${label}.png`);
					await fs.writeFile(pngPath, dataUrlToBuffer(dataUrl));
					inputs.push("-loop", "1", "-framerate", "30", "-t", String(cardDurationSec), "-i", pngPath);
					inputIndex += 1;
				}

				// Main video input
				inputs.push("-i", videoPath);
				const mainIndex = inputIndex;

				// Concat filter: [intro?][main][outro?] — re-encode for compatibility
				const streamLabels: string[] = [];
				let cardIdx = 0;
				if (introDataUrl) {
					filterParts.push(`[${cardIdx}:v]format=yuv420p,setpts=PTS-STARTPTS[intro]`);
					streamLabels.push("[intro]");
					cardIdx += 1;
				}
				streamLabels.push(`[${mainIndex}:v]`);
				if (outroDataUrl) {
					filterParts.push(`[${cardIdx}:v]format=yuv420p,setpts=PTS-STARTPTS[outro]`);
					streamLabels.push("[outro]");
				}
				filterParts.push(
					`${streamLabels.join("")}concat=n=${streamLabels.length}:v=1:a=0[outv]`,
				);

				const parsed = path.parse(videoPath);
				const outputPath = path.join(
					parsed.dir,
					`${parsed.name}-branded${parsed.ext}`,
				);

				await runFfmpeg(ffmpegPath, [
					"-y",
					...inputs,
					"-filter_complex",
					filterParts.join(";"),
					"-map",
					"[outv]",
					// keep original audio from the main video
					"-map",
					`${mainIndex}:a?`,
					"-c:v",
					"libx264",
					"-pix_fmt",
					"yuv420p",
					"-c:a",
					"aac",
					"-movflags",
					"+faststart",
					outputPath,
				]);

				// cleanup temp images
				await fs.rm(tmpDir, { recursive: true, force: true });

				return { success: true, outputPath };
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}
		},
	);
}
